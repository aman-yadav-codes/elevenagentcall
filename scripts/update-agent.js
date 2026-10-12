const fs = require('fs');

// Load environment variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/ELEVENLABS_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : '';

const agentId = 'agent_0701m4qgzp9efg582te690zt2mwf';

const tools = [
  {
    type: 'client',
    name: 'check_product_stock',
    description: 'Queries product stock quantity, price, variants (colors, flavors, sizes), category, and section location from the supermarket database.',
    parameters: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description: 'Product name, SKU, or keyword to search (e.g. Whole Milk, Oat Milk, Sourdough, Apples)'
        }
      }
    },
    expects_response: true
  },
  {
    type: 'client',
    name: 'get_low_stock_alerts',
    description: 'Retrieves all active critical stock alerts, out-of-stock items, and low-stock warnings across supermarket sections and categories.',
    parameters: {
      type: 'object',
      required: [],
      properties: {}
    },
    expects_response: true
  },
  {
    type: 'client',
    name: 'get_section_overview',
    description: 'Looks up supermarket categories and sections overview, section manager, temperature zone, and shelf count.',
    parameters: {
      type: 'object',
      required: [],
      properties: {
        section: {
          type: 'string',
          description: 'Section or category name (e.g. Produce, Dairy, Bakery, Meat, Beverages)'
        }
      }
    },
    expects_response: true
  },
  {
    type: 'client',
    name: 'get_customer_info',
    description: 'Retrieves regular loyalty supermarket shopper profile, shopping frequency, loyalty points, family notes, and weekly recurring items.',
    parameters: {
      type: 'object',
      required: [],
      properties: {
        customer_name: {
          type: 'string',
          description: 'Name of the customer (e.g. Aman, Elena, Marcus, Chloe)'
        }
      }
    },
    expects_response: true
  },
  {
    type: 'client',
    name: 'update_product_stock',
    description: 'WRITE ACTION: Updates product stock quantity (restocking or decrementing) in the supermarket inventory database.',
    parameters: {
      type: 'object',
      required: ['sku', 'quantity'],
      properties: {
        sku: {
          type: 'string',
          description: 'The SKU of the product to update (e.g. SKU-DAIR-302)'
        },
        quantity: {
          type: 'number',
          description: 'The quantity to add (positive number to restock, negative to reduce)'
        }
      }
    },
    expects_response: true
  },
  {
    type: 'client',
    name: 'update_customer_record',
    description: 'WRITE ACTION: Updates customer profiles in MongoDB with new notes, family shopping habits, weekly recurring items, or loyalty points. Use this when the manager wants to add information about a customer (such as Aman or their family).',
    parameters: {
      type: 'object',
      required: ['customer_name'],
      properties: {
        customer_name: {
          type: 'string',
          description: 'Name of the customer (e.g. Aman, Elena, Marcus, Chloe)'
        },
        note: {
          type: 'string',
          description: 'New note or family shopping habit to add (e.g. Father prefers lactose-free milk, always buys snacks on Friday)'
        },
        add_weekly_item: {
          type: 'string',
          description: 'Product or item to add to their weekly recurrent list (e.g. Lactose-Free Milk)'
        },
        loyalty_points_delta: {
          type: 'number',
          description: 'Points to add or deduct'
        }
      }
    },
    expects_response: true
  },
  {
    type: 'client',
    name: 'delete_customer_record',
    description: 'DESTRUCTIVE WRITE ACTION: Permanently deletes a customer profile from the database. REQUIRES EXPLICIT PRIOR CONFIRMATION FROM THE MANAGER.',
    parameters: {
      type: 'object',
      required: ['customer_name'],
      properties: {
        customer_name: {
          type: 'string',
          description: 'Name or ID of customer to delete'
        },
        confirmed: {
          type: 'boolean',
          description: 'Must be true ONLY if the manager has explicitly confirmed the deletion after being warned.'
        }
      }
    },
    expects_response: true
  },
  {
    type: 'client',
    name: 'delete_product_record',
    description: 'DESTRUCTIVE WRITE ACTION: Permanently removes a product from the supermarket catalog and deletes active alerts. REQUIRES EXPLICIT PRIOR CONFIRMATION FROM THE MANAGER.',
    parameters: {
      type: 'object',
      required: ['sku'],
      properties: {
        sku: {
          type: 'string',
          description: 'SKU of the product to delete'
        },
        confirmed: {
          type: 'boolean',
          description: 'Must be true ONLY if the manager has explicitly confirmed the deletion after being warned.'
        }
      }
    },
    expects_response: true
  }
];

const systemPrompt = `You are MarketVoice, the intelligent Supermarket Floor & Inventory AI Co-Pilot for Store Managers.
You have FULL READ AND WRITE ACCESS to the live MongoDB supermarket database.

TERMINOLOGY:
- Always refer to store areas as 'Categories' and 'Sections' (e.g., Dairy Section, Fresh Produce Category, Bakery Section). Avoid using the word 'aisle'.

WRITE & UPDATE CAPABILITIES:
1. Customer Records: You can update customer profiles (notes, family shopping habits, weekly recurring items, loyalty points) using \`update_customer_record\`.
   - When the manager says something like: "Aman has...", "add note to Aman that his father prefers lactose-free milk", or "update Aman's shopping habits", you MUST call \`update_customer_record\` immediately with the customer_name and note, and confirm to the manager that it has been saved to the database.
   - NEVER claim that you are read-only! You have full read-and-write permissions.
2. Inventory & Stock: You can update stock quantities or restock products using \`update_product_stock\`.
3. Inventory Alerts: You can check live warnings using \`get_low_stock_alerts\`.

SAFETY GUARDRAIL FOR DESTRUCTIVE COMMANDS:
- Any destructive command (such as permanently deleting a customer profile, wiping out inventory, or deleting a product) is HIGH RISK.
- Before executing any destructive deletion, you MUST FIRST ask the manager for confirmation:
  "Deleting [item or customer] is a permanent action that will erase their data. Are you sure you want to proceed? Please confirm with yes or no."
- You must NOT call \`delete_customer_record\` or \`delete_product_record\` with confirmed=true UNTIL the manager explicitly answers with "yes", "proceed", or "haan delete kardo".

MULTILINGUAL & HINDI SUPPORT:
- You natively understand English, Hindi (हिन्दी), and conversational Hinglish (code-mixed Hindi-English).
- If the manager speaks in Hindi or Hinglish (e.g., "Aman ka record update karo", "Aman ke bare mein note add karo ki unke father lactose-free milk lete hain", "Kitna doodh bacha hai Dairy section mein?", "Low stock alert batao"), understand them fluently and respond in natural, friendly, professional Hindi / Hinglish.
- If the manager speaks English, respond in English.
- Always be concise, snappy, and clear for a fast-paced retail supermarket environment.`;

async function updateAgent() {
  const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          first_message: 'Hello Manager! Supermarket inventory and all 8 categories and sections are live with full read and write access. What would you like to check or update?',
          prompt: {
            prompt: systemPrompt,
            tools: tools
          }
        }
      }
    })
  });

  const data = await res.json();
  if (data.agent_id) {
    console.log('SUCCESS: ElevenLabs Agent updated successfully!');
    console.log('Agent ID:', data.agent_id);
    console.log('Tools Count:', data.conversation_config?.agent?.prompt?.tools?.length);
  } else {
    console.error('ERROR updating agent:', data);
  }
}

updateAgent();
