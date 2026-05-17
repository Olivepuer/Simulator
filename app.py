"""
Bloomberg Help Desk Ticketing System
=====================================
Entry point for the Flask application.
Run with: python app.py
Then open http://127.0.0.1:5000 in your browser.
"""

from flask import Flask, render_template, jsonify, request
import random
import string
import time

app = Flask(__name__)

# ─────────────────────────────────────────────
#  DATA: Customer profiles pool
#  Each profile is fully unique.
#  Add more profiles here as needed.
# ─────────────────────────────────────────────
CUSTOMER_PROFILES = [
    {
        "name": "Alexandra Thornton",
        "position": "Portfolio Manager",
        "firm": "Vanguard Asset Management",
        "uid": "482019374",
        "language": "English",
        "city": "Philadelphia",
        "country": "United States"
    },
    {
        "name": "Hiroshi Nakamura",
        "position": "Quantitative Analyst",
        "firm": "Nomura Securities",
        "uid": "750293841",
        "language": "Japanese / English",
        "city": "Tokyo",
        "country": "Japan"
    },
    {
        "name": "Isabelle Fontaine",
        "position": "Fixed Income Trader",
        "firm": "BNP Paribas",
        "uid": "319485062",
        "language": "French / English",
        "city": "Paris",
        "country": "France"
    },
    {
        "name": "Marcus De Villiers",
        "position": "Risk Analyst",
        "firm": "Standard Bank Group",
        "uid": "627140983",
        "language": "English / Afrikaans",
        "city": "Johannesburg",
        "country": "South Africa"
    },
    {
        "name": "Sofia Esposito",
        "position": "Equity Derivatives Trader",
        "firm": "UniCredit SpA",
        "uid": "901847253",
        "language": "Italian / English",
        "city": "Milan",
        "country": "Italy"
    },
    {
        "name": "Chen Wei",
        "position": "Head of Research",
        "firm": "CITIC Securities",
        "uid": "134729580",
        "language": "Mandarin / English",
        "city": "Shanghai",
        "country": "China"
    },
    {
        "name": "Priya Mehta",
        "position": "Investment Strategist",
        "firm": "HDFC Asset Management",
        "uid": "865031492",
        "language": "Hindi / English",
        "city": "Mumbai",
        "country": "India"
    },
    {
        "name": "Lars Eriksson",
        "position": "Credit Analyst",
        "firm": "Handelsbanken",
        "uid": "492817630",
        "language": "Swedish / English",
        "city": "Stockholm",
        "country": "Sweden"
    },
    {
        "name": "Fatima Al-Rashid",
        "position": "Compliance Officer",
        "firm": "Abu Dhabi Investment Authority",
        "uid": "273946015",
        "language": "Arabic / English",
        "city": "Abu Dhabi",
        "country": "UAE"
    },
    {
        "name": "James O'Sullivan",
        "position": "Macro Strategist",
        "firm": "Man Group",
        "uid": "618304729",
        "language": "English",
        "city": "London",
        "country": "United Kingdom"
    },
]

# ─────────────────────────────────────────────
#  DATA: Ticket buckets and their questions
#  Questions are grouped by bucket category.
#  Expand each list to grow the question bank.
# ─────────────────────────────────────────────
TICKET_BUCKETS = {
    "Foundational": [
        "I can't seem to log into my Bloomberg terminal. It keeps telling me my credentials are invalid, but I haven't changed anything. What's going on?",
        "How do I pull up a company's earnings history? I've been clicking around for 20 minutes.",
        "My Bloomberg screen just went black. Nothing is responding. Is the system down?",
        "I need to download historical price data for a basket of equities into Excel. Can you walk me through that?",
        "I'm trying to set up a custom screen but I have no idea where to start.",
    ],
    "SMSG/IB Admin": [
        "I sent a message to a counterpart via IB and they're saying they never received it. Can you check on that?",
        "How do I set up a group chat in Bloomberg messaging for my trading desk?",
        "My IB messages aren't loading — the feed just spins. Is there a server issue?",
        "I need to recall a message I sent 10 minutes ago. Is that possible through Bloomberg messaging?",
        "Can you tell me how to configure auto-replies on Bloomberg IB while I'm on vacation?",
    ],
    "MYBB": [
        "I customized my Bloomberg layout last week and now it's completely gone. How do I restore it?",
        "Can I sync my MYBB settings across multiple terminal workstations?",
        "I'm trying to build a custom dashboard and the drag-and-drop isn't working right.",
        "One of my saved panels is showing the wrong data — it looks like it's pulling from the wrong security.",
        "How do I export my MYBB layout to share with a colleague?",
    ],
    "API Review": [
        "I'm getting a 403 error when trying to authenticate with the Bloomberg Data License API. My keys were working yesterday.",
        "The B-PIPE feed is dropping data points intermittently. How do I diagnose this?",
        "I need to understand the rate limits for the Bloomberg Terminal Connect API before we go live.",
        "Our Python blpapi script is throwing a SessionNotStartedException even after we open the session. Any idea?",
        "Can you explain the difference between BDP, BDH, and BDS functions in the Bloomberg API?",
    ],
}

# ─────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main Help Desk UI."""
    return render_template("index.html")


@app.route("/api/new_ticket", methods=["GET"])
def new_ticket():
    """
    Generate a brand-new ticket with:
      - A random bucket category
      - A random question from that bucket
      - A random unique customer profile
    Returns JSON consumed by the frontend JS.
    """
    bucket = random.choice(list(TICKET_BUCKETS.keys()))
    question = random.choice(TICKET_BUCKETS[bucket])
    profile = random.choice(CUSTOMER_PROFILES)

    # Generate a short ticket ID (e.g. TK-7X3Q)
    ticket_id = "TK-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))

    return jsonify({
        "ticket_id": ticket_id,
        "bucket": bucket,
        "question": question,
        "profile": profile,
        "timestamp": int(time.time())
    })


@app.route("/api/ai_response", methods=["POST"])
def ai_response():
    """
    Proxy endpoint for the Claude AI chat within tickets.
    Receives: { history: [...], bucket: str }
    Returns: { reply: str }
    Calls Anthropic API server-side so the key never touches the browser.
    """
    import anthropic

    data = request.json
    history = data.get("history", [])
    bucket = data.get("bucket", "Foundational")

    # System prompt gives the AI its persona per bucket
    system_prompt = f"""You are a frustrated but professional Bloomberg Terminal client 
contacting the Help Desk about a {bucket} issue. Follow these rules strictly:
1. Stay in character at all times — you are a real finance professional who needs help.
2. Start impatient and skeptical. Warm up slightly as the rep helps you effectively.
3. Ask follow-up questions if the rep's answer is vague or incomplete.
4. Push back if something doesn't make sense or doesn't solve your problem.
5. If the rep gives a clear, correct, and complete solution, acknowledge it and say the issue is resolved.
6. If the rep greets you without addressing the issue yet, respond naturally — introduce yourself and restate your problem briefly.
7. NEVER offer the solution yourself. You are the client, not the expert.
8. Keep replies to 2-4 sentences. Be realistic and professional at all times.
9. When the issue is fully resolved, end with something like: 'Thank you, that sorted it out.' so the rep knows to type {{CLOSE}}."""

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=300,
        system=system_prompt,
        messages=history
    )

    reply_text = message.content[0].text
    return jsonify({"reply": reply_text})


# ─────────────────────────────────────────────
#  RUN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    # debug=True gives live reload during development
    import os
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
