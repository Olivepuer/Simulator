# Bloomberg Help Desk Training Simulator

A training tool for Bloomberg Help Desk representatives.
Simulates a realistic ticketing system with AI-powered client personas.

---

## Project Structure

```
bloomberg_helpdesk/
├── app.py                  # Flask backend — routes, ticket data, AI proxy
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Main HTML UI (3-panel layout)
└── static/
    ├── css/
    │   └── style.css       # Bloomberg terminal theme
    └── js/
        └── main.js         # All client-side logic
```

---

## How to Run (Outside Claude/ChatGPT)

### 1. Prerequisites
- Python 3.9 or higher installed
- An Anthropic API key (get one at https://console.anthropic.com)

### 2. Install Dependencies

Open a terminal in the `bloomberg_helpdesk/` folder and run:

```bash
pip install -r requirements.txt
```

### 3. Set Your Anthropic API Key

**Mac/Linux:**
```bash
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

**Windows (Command Prompt):**
```cmd
set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

### 4. Run the App

```bash
python app.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### 5. Open in Browser

Go to: **http://127.0.0.1:5000**

---

## How It Works

| Panel | Purpose |
|-------|---------|
| **Left** | Ticket queue — up to 3 tickets, each with a 30s timer |
| **Middle** | Chat interface — click a ticket to open its conversation |
| **Right** | Client profile — name, firm, UUID, language, location |

### Status Buttons
| Button | Color | Ticket Chance |
|--------|-------|--------------|
| Hit  | Blue  | 5% per second |
| Add  | Green | 1% per second |
| Hold | Green | No new tickets |
| Del  | Red   | Clears all tickets |

---

## Adding Content

- **New questions**: Edit `TICKET_BUCKETS` in `app.py`
- **New customer profiles**: Add entries to `CUSTOMER_PROFILES` in `app.py`
- **New buckets**: Add a new key to `TICKET_BUCKETS`
- **AI persona**: Tweak the `system_prompt` in the `/api/ai_response` route

---

## Presenting to Your Boss

For a polished demo:
1. Set status to **Hit** and wait a few seconds for tickets to appear
2. Click a ticket to open the chat
3. Respond as a Help Desk rep — the AI client will push back
4. Switch between multiple tickets to show multi-tasking
5. Let a ticket timer expire to show auto-removal
