import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDirectiveSchema, insertNoticeSchema, chatRequestSchema, excelImportSchema, insertStoreSchema, insertResupplyItemSchema, type CalendarEvent } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import * as XLSX from "xlsx";
import multer from "multer";

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

  // Calendar endpoints
  app.get("/api/calendar/events", async (req, res) => {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        res.status(400).json({ error: "from and to date parameters are required" });
        return;
      }

      // Get directives with due dates in range
      const allDirectives = await storage.getDirectives({});
      const directivesInRange = allDirectives.filter(d => {
        if (!d.dueAt) return false;
        const dueDate = new Date(d.dueAt);
        return dueDate >= new Date(from as string) && dueDate <= new Date(to as string);
      });

      // Get notices in range
      const notices = await storage.getNotices({
        from: from as string,
        to: to as string,
      });

      // Convert to calendar events
      const events: CalendarEvent[] = [
        ...directivesInRange.map(d => ({
          id: d.id,
          title: d.title,
          notes: d.notes,
          priority: d.priority,
          date: d.dueAt!,
          type: "directive" as const,
          completed: d.completed,
        })),
        ...notices.map(n => ({
          id: n.id,
          title: n.title,
          notes: n.notes,
          priority: n.priority,
          date: n.at,
          type: "notice" as const,
          repeat: n.repeat,
        })),
      ];

      // Sort by date
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      res.json(events);
    } catch (error) {
      console.error("Error getting calendar events:", error);
      res.status(500).json({ error: "Failed to get calendar events" });
    }
  });

  // Excel import endpoint
  const upload = multer({ storage: multer.memoryStorage() });
  
  app.post("/api/calendar/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const imported = {
        directives: 0,
        notices: 0,
        errors: [] as string[],
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        
        try {
          const importData = excelImportSchema.parse({
            title: row.title || row.Title || row.TITLE,
            date: row.date || row.Date || row.DATE,
            priority: row.priority || row.Priority || row.PRIORITY || "Charlie",
            notes: row.notes || row.Notes || row.NOTES || undefined,
            type: row.type || row.Type || row.TYPE || "directive",
            repeat: row.repeat || row.Repeat || row.REPEAT || "none",
          });

          // Create directive or notice
          if (importData.type === "notice") {
            await storage.createNotice({
              title: importData.title,
              notes: importData.notes,
              priority: importData.priority || "Charlie",
              at: importData.date,
              repeat: importData.repeat || "none",
            });
            imported.notices++;
          } else {
            await storage.createDirective({
              title: importData.title,
              notes: importData.notes,
              priority: importData.priority || "Charlie",
              dueAt: importData.date,
            });
            imported.directives++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          imported.errors.push(`Row ${i + 1}: ${errorMsg}`);
        }
      }

      res.json(imported);
    } catch (error) {
      console.error("Error importing from Excel:", error);
      res.status(500).json({ error: "Failed to import from Excel" });
    }
  });

  // Stores endpoints
  app.get("/api/stores", async (req, res) => {
    try {
      const stores = await storage.getStores();
      res.json(stores);
    } catch (error) {
      console.error("Error getting stores:", error);
      res.status(500).json({ error: "Failed to get stores" });
    }
  });

  app.post("/api/stores", async (req, res) => {
    try {
      const data = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(data);
      res.json(store);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating store:", error);
        res.status(500).json({ error: "Failed to create store" });
      }
    }
  });

  app.delete("/api/stores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStore(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting store:", error);
      res.status(500).json({ error: "Failed to delete store" });
    }
  });

  // Resupply Items endpoints
  app.get("/api/resupply", async (req, res) => {
    try {
      const { storeId, category } = req.query;
      const items = await storage.getResupplyItems({
        storeId: storeId as string,
        category: category as string,
      });
      res.json(items);
    } catch (error) {
      console.error("Error getting resupply items:", error);
      res.status(500).json({ error: "Failed to get resupply items" });
    }
  });

  app.post("/api/resupply", async (req, res) => {
    try {
      const data = insertResupplyItemSchema.parse(req.body);
      const item = await storage.createResupplyItem(data);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating resupply item:", error);
        res.status(500).json({ error: "Failed to create resupply item" });
      }
    }
  });

  app.patch("/api/resupply/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { purchased, ...updates } = req.body;

      const item = await storage.updateResupplyItem(id, {
        ...updates,
        purchased: purchased !== undefined ? Boolean(purchased) : undefined,
      });
      res.json(item);
    } catch (error) {
      if ((error as Error).message === "Resupply item not found") {
        res.status(404).json({ error: "Resupply item not found" });
      } else {
        console.error("Error updating resupply item:", error);
        res.status(500).json({ error: "Failed to update resupply item" });
      }
    }
  });

  app.delete("/api/resupply/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteResupplyItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting resupply item:", error);
      res.status(500).json({ error: "Failed to delete resupply item" });
    }
  });

  // Chat endpoint with OpenAI streaming and function calling
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

      // Define tools/functions the AI can call
      const tools = [
        {
          type: "function" as const,
          function: {
            name: "create_directive",
            description: "Create a new directive (task) in the Blue Dog Command system. Use this when the user wants to add a task or directive. Priority levels: Alpha (critical), Bravo (high), Charlie (medium), Delta (low).",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The directive title/summary (required)"
                },
                notes: {
                  type: "string",
                  description: "Additional details or notes about the directive (optional)"
                },
                priority: {
                  type: "string",
                  enum: ["Alpha", "Bravo", "Charlie", "Delta"],
                  description: "Priority level: Alpha (critical/immediate), Bravo (high/24-48hr), Charlie (medium/routine), Delta (low/can postpone)"
                },
                dueAt: {
                  type: "string",
                  description: "Due date/time in ISO 8601 format (optional, e.g., '2024-12-25T14:30:00Z')"
                }
              },
              required: ["title", "priority"]
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "create_notice",
            description: "Create a new operational notice (reminder) in the Blue Dog Command system. Use this when the user wants to set a reminder or schedule a notice.",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The notice title/summary (required)"
                },
                notes: {
                  type: "string",
                  description: "Additional details about the notice (optional)"
                },
                priority: {
                  type: "string",
                  enum: ["Alpha", "Bravo", "Charlie", "Delta"],
                  description: "Priority level: Alpha (critical), Bravo (high), Charlie (medium), Delta (low)"
                },
                at: {
                  type: "string",
                  description: "When the notice should trigger, in ISO 8601 format (required, e.g., '2024-12-25T09:00:00Z')"
                },
                repeat: {
                  type: "string",
                  enum: ["none", "daily", "weekly", "monthly"],
                  description: "How often the notice should repeat (optional, defaults to 'none')"
                }
              },
              required: ["title", "priority", "at"]
            }
          }
        }
      ];

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      streamingStarted = true;

      // Create initial completion with tools
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a tactical AI assistant for Blue Dog Command, a military-themed command center. You can help users create directives (tasks) and operational notices (reminders). When users ask you to create these items, use the provided functions. If you need more information (like priority level, due date, or scheduling time), ask the user for those details before calling the function. Provide concise, professional responses using military terminology where appropriate.'
          },
          ...messages
        ],
        tools,
        tool_choice: "auto",
        temperature: 0.7,
      });

      const responseMessage = response.choices[0].message;

      // Check if AI wants to call functions
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Execute all tool calls
        const toolResults = [];
        
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;
          
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          let result;
          try {
            if (functionName === "create_directive") {
              const directiveData = {
                title: functionArgs.title,
                notes: functionArgs.notes || null,
                priority: functionArgs.priority,
                dueAt: functionArgs.dueAt || null,
              };
              
              const validated = insertDirectiveSchema.parse(directiveData);
              const directive = await storage.createDirective(validated);
              result = {
                success: true,
                directive,
                message: `Directive created successfully: "${directive.title}" (Priority ${directive.priority})`
              };
            } else if (functionName === "create_notice") {
              const noticeData = {
                title: functionArgs.title,
                notes: functionArgs.notes || null,
                priority: functionArgs.priority,
                at: functionArgs.at,
                repeat: functionArgs.repeat || "none",
              };
              
              const validated = insertNoticeSchema.parse(noticeData);
              const notice = await storage.createNotice(validated);
              result = {
                success: true,
                notice,
                message: `Notice created successfully: "${notice.title}" scheduled for ${new Date(notice.at).toLocaleString()}`
              };
            } else {
              result = { success: false, error: "Unknown function" };
            }
          } catch (error) {
            console.error(`Error executing ${functionName}:`, error);
            result = { 
              success: false, 
              error: error instanceof Error ? error.message : "Failed to execute function"
            };
          }
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool" as const,
            name: functionName,
            content: JSON.stringify(result)
          });
        }

        // Get final response from AI after function execution
        const finalResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a tactical AI assistant for Blue Dog Command, a military-themed command center. You can help users create directives (tasks) and operational notices (reminders). When users ask you to create these items, use the provided functions. If you need more information (like priority level, due date, or scheduling time), ask the user for those details before calling the function. Provide concise, professional responses using military terminology where appropriate.'
            },
            ...messages,
            responseMessage,
            ...toolResults
          ],
          stream: true,
          temperature: 0.7,
        });

        // Stream the final response
        for await (const chunk of finalResponse) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            res.write(content);
          }
        }
      } else {
        // No function calls, just stream the regular response
        const stream = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a tactical AI assistant for Blue Dog Command, a military-themed command center. You can help users create directives (tasks) and operational notices (reminders). When users ask you to create these items, use the provided functions. If you need more information (like priority level, due date, or scheduling time), ask the user for those details before calling the function. Provide concise, professional responses using military terminology where appropriate.'
            },
            ...messages
          ],
          tools,
          tool_choice: "auto",
          stream: true,
          temperature: 0.7,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            res.write(content);
          }
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
