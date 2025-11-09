import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDirectiveSchema, insertNoticeSchema, chatRequestSchema, excelImportSchema, insertStoreSchema, insertCategorySchema, insertResupplyItemSchema, type CalendarEvent } from "@shared/schema";
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

  // Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error getting categories:", error);
      res.status(500).json({ error: "Failed to get categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating category:", error);
        res.status(500).json({ error: "Failed to create category" });
      }
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Resupply Items endpoints
  app.get("/api/resupply", async (req, res) => {
    try {
      const { storeId, categoryId } = req.query;
      const items = await storage.getResupplyItems({
        storeId: storeId as string,
        categoryId: categoryId as string,
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
        },
        {
          type: "function" as const,
          function: {
            name: "list_stores",
            description: "Get all existing stores in the resupply system. Use this to check if a store already exists before creating a new one.",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "list_categories",
            description: "Get all existing categories in the resupply system. Use this to check if a category already exists before creating a new one.",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "create_store",
            description: "Create a new store in the resupply system. Stores are used to organize shopping lists by location (e.g., 'Home Depot', 'Costco', 'Amazon'). Always check existing stores with list_stores first to avoid duplicates.",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The store name (required, e.g., 'Home Depot', 'Costco')"
                }
              },
              required: ["name"]
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "create_category",
            description: "Create a new category in the resupply system. Categories are used to organize items (e.g., 'Hardware', 'Food', 'Electronics', 'Office Supplies'). Always check existing categories with list_categories first to avoid duplicates.",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The category name (required, e.g., 'Hardware', 'Food')"
                }
              },
              required: ["name"]
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "create_resupply_item",
            description: "Add an item to the resupply list (shopping list). Provide the store name and category name - the system will automatically create them if they don't exist, or reuse existing ones if they do.",
            parameters: {
              type: "object",
              properties: {
                item: {
                  type: "string",
                  description: "The item name (required, e.g., 'Batteries AA', 'Coffee beans')"
                },
                quantity: {
                  type: "string",
                  description: "The quantity needed (required, e.g., '2 packs', '1 box', '5 lbs')"
                },
                categoryName: {
                  type: "string",
                  description: "The category name (required, e.g., 'Groceries', 'Hardware', 'Electronics'). Will be created if it doesn't exist."
                },
                storeName: {
                  type: "string",
                  description: "The store name (required, e.g., 'Costco', 'Home Depot', 'Target'). Will be created if it doesn't exist."
                }
              },
              required: ["item", "quantity", "categoryName", "storeName"]
            }
          }
        }
      ];

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      streamingStarted = true;

      // Build conversation history
      const conversationMessages = [
        {
          role: 'system' as const,
          content: 'You are a tactical AI assistant for Blue Dog Command, a military-themed command center. You can help users create directives (tasks), operational notices (reminders), and manage resupply lists (shopping lists).\n\nIMPORTANT RULES:\n- When creating a directive, you MUST ask the user for the priority level (Alpha, Bravo, Charlie, or Delta) if they did not specify it. DO NOT assume or choose a priority on their behalf.\n- When creating a directive, you SHOULD ask the user if they want to set a due date unless they explicitly said they don\'t need one.\n- When creating a notice, you MUST ask for the scheduled time if not provided.\n- When adding items to the resupply list, use create_resupply_item with the item name, quantity, store name, and category name. The system will automatically create stores and categories if they don\'t exist.\n- You can create multiple items in sequence by calling the functions multiple times.\n- Only call the creation functions after you have all required information from the user.\n\nProvide concise, professional responses using military terminology where appropriate.'
        },
        ...messages
      ];

      // Allow multiple rounds of function calling
      let maxIterations = 5; // Prevent infinite loops
      let currentIteration = 0;
      
      while (currentIteration < maxIterations) {
        currentIteration++;
        
        // Create completion with tools
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: conversationMessages,
          tools,
          tool_choice: "auto",
          temperature: 0.7,
        });

        const responseMessage = response.choices[0].message;

        // Check if AI wants to call functions
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          const toolCall = responseMessage.tool_calls[0];
          
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            // Server-side validation: check for missing required fields
            let missingInfo = null;
            
            if (functionName === "create_directive" && !functionArgs.priority) {
              missingInfo = "I need to know the priority level for this directive. Please specify:\n\n• **Alpha** (Critical/Immediate)\n• **Bravo** (High priority, 24-48hr)\n• **Charlie** (Medium/Routine)\n• **Delta** (Low urgency)\n\nWhich priority level should I assign?";
            } else if (functionName === "create_notice" && !functionArgs.at) {
              missingInfo = "I need to know when this notice should be scheduled. Please provide a date and time (e.g., 'tomorrow at 9am', 'next Monday at 14:00', or '2024-12-25 at 10:30').";
            }
            
            if (missingInfo) {
              // Stream the clarification question instead of executing the function
              res.write(missingInfo);
              res.end();
              return;
            }
          }
          
          // Execute all tool calls
          const toolResults = [];
          
          for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;
          
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          let result;
          try {
            console.log(`[AI Function Call] ${functionName}`, functionArgs);
            
            if (functionName === "list_stores") {
              const stores = await storage.getStores();
              result = {
                success: true,
                stores,
                message: stores.length > 0 
                  ? `Found ${stores.length} store(s): ${stores.map(s => `${s.name} (ID: ${s.id})`).join(', ')}`
                  : "No stores found in the system"
              };
            } else if (functionName === "list_categories") {
              const categories = await storage.getCategories();
              result = {
                success: true,
                categories,
                message: categories.length > 0
                  ? `Found ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}: ${categories.map(c => `${c.name} (ID: ${c.id})`).join(', ')}`
                  : "No categories found in the system"
              };
            } else if (functionName === "create_directive") {
              const directiveData = {
                title: functionArgs.title,
                notes: functionArgs.notes ?? undefined,
                priority: functionArgs.priority,
                dueAt: functionArgs.dueAt ?? undefined,
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
                notes: functionArgs.notes ?? undefined,
                priority: functionArgs.priority,
                at: functionArgs.at,
                repeat: functionArgs.repeat ?? "none",
              };
              
              const validated = insertNoticeSchema.parse(noticeData);
              const notice = await storage.createNotice(validated);
              result = {
                success: true,
                notice,
                message: `Notice created successfully: "${notice.title}" scheduled for ${new Date(notice.at).toLocaleString()}`
              };
            } else if (functionName === "create_store") {
              const storeData = {
                name: functionArgs.name,
              };
              
              const validated = insertStoreSchema.parse(storeData);
              const store = await storage.createStore(validated);
              result = {
                success: true,
                store,
                message: `Store "${store.name}" created successfully with ID: ${store.id}`
              };
            } else if (functionName === "create_category") {
              const categoryData = {
                name: functionArgs.name,
              };
              
              const validated = insertCategorySchema.parse(categoryData);
              const category = await storage.createCategory(validated);
              result = {
                success: true,
                category,
                message: `Category "${category.name}" created successfully with ID: ${category.id}`
              };
            } else if (functionName === "create_resupply_item") {
              // Handle name-based creation (find or create store/category by name)
              const storeName = functionArgs.storeName;
              const categoryName = functionArgs.categoryName;
              
              // Find or create store
              let store;
              const stores = await storage.getStores();
              store = stores.find(s => s.name.toLowerCase() === storeName.toLowerCase());
              
              if (!store) {
                store = await storage.createStore({ name: storeName });
                console.log(`Created new store: ${store.name} (ID: ${store.id})`);
              } else {
                console.log(`Reusing existing store: ${store.name} (ID: ${store.id})`);
              }
              
              // Find or create category
              let category;
              const categories = await storage.getCategories();
              category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
              
              if (!category) {
                category = await storage.createCategory({ name: categoryName });
                console.log(`Created new category: ${category.name} (ID: ${category.id})`);
              } else {
                console.log(`Reusing existing category: ${category.name} (ID: ${category.id})`);
              }
              
              // Create resupply item with found/created IDs
              const itemData = {
                item: functionArgs.item,
                quantity: functionArgs.quantity,
                categoryId: category.id,
                storeId: store.id,
              };
              
              const validated = insertResupplyItemSchema.parse(itemData);
              const resupplyItem = await storage.createResupplyItem(validated);
              result = {
                success: true,
                resupplyItem,
                message: `Added "${resupplyItem.item}" (${resupplyItem.quantity}) to ${store.name} under ${category.name}`
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
          
          console.log(`[AI Function Result] ${functionName}:`, result);
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool" as const,
            name: functionName,
            content: JSON.stringify(result)
          });
        }

        // Add assistant message and tool results to conversation
        conversationMessages.push(responseMessage);
        conversationMessages.push(...toolResults);
        
        // Continue loop to allow AI to make more function calls or respond
      } else {
        // No function calls - AI wants to respond with text
        // Stream the text response
        if (responseMessage.content) {
          res.write(responseMessage.content);
        }
        break; // Exit loop
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
