import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDirectiveSchema, insertNoticeSchema, chatRequestSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  // Status endpoint
  app.get("/api/status", async (req, res) => {
    try {
      const status = await storage.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting status:", error);
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // Directives endpoints
  app.get("/api/directives", async (req, res) => {
    try {
      const { status, priority } = req.query;
      const directives = await storage.getDirectives({
        status: status as string,
        priority: priority as string,
      });
      res.json(directives);
    } catch (error) {
      console.error("Error getting directives:", error);
      res.status(500).json({ error: "Failed to get directives" });
    }
  });

  app.post("/api/directives", async (req, res) => {
    try {
      const data = insertDirectiveSchema.parse(req.body);
      const directive = await storage.createDirective(data);
      res.status(201).json(directive);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        console.error("Error creating directive:", error);
        res.status(500).json({ error: "Failed to create directive" });
      }
    }
  });

  app.patch("/api/directives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Validate that at least some fields are provided
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "No updates provided" });
        return;
      }

      const directive = await storage.updateDirective(id, updates);
      res.json(directive);
    } catch (error) {
      if ((error as Error).message === "Directive not found") {
        res.status(404).json({ error: "Directive not found" });
      } else {
        console.error("Error updating directive:", error);
        res.status(500).json({ error: "Failed to update directive" });
      }
    }
  });

  app.delete("/api/directives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDirective(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting directive:", error);
      res.status(500).json({ error: "Failed to delete directive" });
    }
  });

  // Notices endpoints
  app.get("/api/notices", async (req, res) => {
    try {
      const { from, to } = req.query;
      const notices = await storage.getNotices({
        from: from as string,
        to: to as string,
      });
      res.json(notices);
    } catch (error) {
      console.error("Error getting notices:", error);
      res.status(500).json({ error: "Failed to get notices" });
    }
  });

  app.post("/api/notices", async (req, res) => {
    try {
      const data = insertNoticeSchema.parse(req.body);
      const notice = await storage.createNotice(data);
      res.status(201).json(notice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        console.error("Error creating notice:", error);
        res.status(500).json({ error: "Failed to create notice" });
      }
    }
  });

  app.patch("/api/notices/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "No updates provided" });
        return;
      }

      const notice = await storage.updateNotice(id, updates);
      res.json(notice);
    } catch (error) {
      if ((error as Error).message === "Notice not found") {
        res.status(404).json({ error: "Notice not found" });
      } else {
        console.error("Error updating notice:", error);
        res.status(500).json({ error: "Failed to update notice" });
      }
    }
  });

  app.delete("/api/notices/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteNotice(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notice:", error);
      res.status(500).json({ error: "Failed to delete notice" });
    }
  });

  // Chat endpoint with OpenAI streaming
  app.post("/api/chat", async (req, res) => {
    let streamingStarted = false;
    
    try {
      const { messages } = chatRequestSchema.parse(req.body);

      if (!process.env.OPENAI_API_KEY) {
        res.status(500).json({ error: "OpenAI API key not configured" });
        return;
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      streamingStarted = true;

      // Create streaming completion with system prompt for tactical assistant
      const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a tactical AI assistant for Blue Dog Command, a military-themed command center. Provide concise, professional responses using military terminology where appropriate. Keep responses brief and actionable.'
          },
          ...messages
        ],
        stream: true,
        temperature: 0.7,
      });

      // Stream chunks to client
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(content);
        }
      }

      res.end();
    } catch (error) {
      console.error("Error in chat:", error);
      
      // Check if we've already started streaming
      if (streamingStarted && res.headersSent) {
        // Headers already sent, can't send JSON error
        // Write error message and end the stream
        try {
          res.write('\n\n[Error: Unable to complete response]');
        } catch (writeError) {
          // Ignore write errors if connection is closed
        }
        res.end();
      } else {
        // Headers not sent yet, can send proper error response
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: "Invalid request data", details: error.errors });
        } else {
          res.status(500).json({ error: "Failed to process chat request" });
        }
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
