# 🕶️ Code In The Dark — Complete Challenge Recreation Guide
> **Event Edition:** 11:11 Chapter 2 — Code In The Dark  
> **Live Deployment:** [11-11-chapter-2-codeinthedark.vercel.app](https://11-11-chapter-2-codeinthedark.vercel.app)  
> **Direct Editor Access:** [11-11-chapter-2-codeinthedark.vercel.app/editor/](https://11-11-chapter-2-codeinthedark.vercel.app/editor/)  
> **GitHub Repository:** [github.com/adithyen/CodeInTheDark](https://github.com/adithyen/CodeInTheDark)

---

## 1. What is Code in the Dark?

**Code in the Dark** is a competitive front-end showdown originally conceptualized by Tictail (now Shopify). Developers compete head-to-head to recreate an exact website screenshot using **pure HTML and CSS** in **15 minutes** with **zero visual previews**, **zero measurement tools**, and **no browser dev tools**.

Contestants type blind in a retro-styled dark editor with explosive **Power Mode** particle effects, combo counters, and screen shakes. When the 15-minute countdown hits zero, everyone lifts their hands off their keyboards, triggers the **Finish** reveal button, and the audience votes on who came closest to the original design.

---

## 2. Repository Architecture & File Walkthrough

```
Code In The Dark/
├── index.html            # Main event landing page
├── css/                  # Landing page styling (cid.css)
├── img/                  # Landing page branding, logos, backgrounds
├── js/                   # Landing page interactions & scripts
├── vote/
│   └── index.html        # Audience voting redirect (Mentimeter / Slido / Live Poll)
├── editor/
│   ├── index.html        # Self-contained Ace-based blind code editor + Power Mode
│   └── assets/
│       ├── page.png          # Target UI screenshot contestants must recreate
│       ├── instructions.html # Rules & asset dimensions cheat-sheet modal
│       ├── result.html       # Sandboxed iframe that receives postMessage on 'Finish'
│       ├── shopify-logo.svg  # Sample asset provided to contestants
│       ├── market-image.jpg  # Sample asset provided to contestants
│       └── start-image.png   # Sample asset provided to contestants
├── CHALLENGE_GUIDE.md    # This complete recreation & scaling documentation
└── CNAME                 # Custom domain configuration (if pointing custom apex)
```

### Key Technical Mechanisms

1. **Blind Coding (No Previews)**:
   - The editor is powered by Ace Editor (`vibrant_ink` theme, `ace/mode/html`).
   - The code stays strictly inside the editor until the contestant clicks **Finish**.
   - Pressing **Finish** requires typing `"yes"` into a confirmation prompt to prevent accidental reveals. Once confirmed, `postMessage(this.editor.getValue(), "*")` transmits the raw code to the hidden `result.html` iframe, which renders the result fullscreen.
2. **Reference Screenshot Modal**:
   - Contestants have a thumbnail preview in the bottom-right corner. Clicking it expands `assets/page.png` to full screen so contestants can study the visual structure at any time without ever seeing their own rendered code.
3. **Power Mode Particle Engine**:
   - Uses an HTML5 `<canvas>` layer on top of the editor.
   - Detects keystroke velocity, character tokens, and streaks.
   - At a 200-stroke streak, triggers **POWER MODE!** with screen shakes, rainbow sparks, and retro combo exclamations (*"Radical!", "Super!", "Stupendous!"*).
4. **State Persistence**:
   - Debounced auto-saving to `localStorage.content` every 300ms protects against accidental tab reloads.
   - Tab closure protection with `window.onbeforeunload = () => "Hold your horses!"`.

---

## 3. Step-by-Step: Recreating the Challenge for Your Event

### Step 1: Choose Your Target UI Design (`page.png`)
Select an iconic or modern web interface suitable for a 15-minute blitz:
- **Recommended Difficulty**: A distinct hero section, a pricing card grid, a sleek media player, or a landing page navbar + CTA + graphic.
- Avoid designs with thousands of tiny paragraphs; focus on recognizable layouts, typography hierarchy, gradients, buttons, and spacing.
- **Capture**: Take a clean, high-resolution desktop screenshot (e.g., 1440×900 or 1280×800) at 100% zoom (1:1 scale).
- **Save to**: `editor/assets/page.png`.

### Step 2: Slice and Provide Asset Files
Contestants should not waste time searching for icons or product images:
1. Export clean SVGs or PNGs of all logos, icons, illustrations, and images present in `page.png`.
2. Save them inside `editor/assets/` using short, memorable filenames:
   - `editor/assets/logo.svg`
   - `editor/assets/hero-banner.jpg`
   - `editor/assets/icon-star.svg`
3. Contestants can reference them directly in their code:
   ```html
   <img src="assets/logo.svg" alt="Logo">
   ```

### Step 3: Update `instructions.html` with Dimensions
Open `editor/assets/instructions.html` and list all assets and their exact pixel dimensions. This gives contestants a reference without needing measurement tools:

```html
--- Assets Available ---
./logo.svg (160x40)
./hero-banner.jpg (640x480)
./user-avatar.png (48x48)
```

### Step 4: Configure Audience Voting (`vote/index.html`)
The audience is the ultimate judge! Set up a live poll service:
1. Create a poll on [Mentimeter](https://www.mentimeter.com/), [Slido](https://www.slido.com/), or [StrawPoll](https://strawpoll.com/).
2. Edit `vote/index.html`:
   ```html
   <html>
       <head>
           <meta http-equiv="refresh" content="0;url=https://www.menti.com/YOUR_EVENT_CODE" />
       </head>
   </html>
   ```
3. Generate a QR code pointing to `https://11-11-chapter-2-codeinthedark.vercel.app/vote/` and project it onto the stage screens.

### Step 5: Multi-Round Tournament Setup (Optional)
If running multiple heats (e.g., Round 1, Round 2, Finals):
- **Option A (Subdirectories)**: Create `editor/round1/`, `editor/round2/`, `editor/finals/` each with its own `assets/` folder.
- **Option B (Query Parameters or Branches)**: Switch the assets folder before each round, or use a Git branch per round (`round-1`, `round-2`, `finals`).

---

## 4. Hardware, Staging, and Anti-Cheat Rules

| Requirement | Specification |
|---|---|
| **Contestant Setup** | Contestants bring laptops. Connect each laptop to an **external monitor facing the audience** (or mirror to a live streaming capture card / projector). |
| **Display Mode** | Laptop and external display must have **screen mirroring enabled**. |
| **Browser State** | Launch browser in **Full Screen / Presentation Mode** (`F11` on Windows, `Ctrl + Cmd + F` on macOS). |
| **Strict Rules** | 1. Pure HTML & CSS only. No frameworks (React, Tailwind, Bootstrap) unless explicitly allowed.<br>2. No browser DevTools (`F12`), inspector, or color pickers.<br>3. No previews or external tabs during the 15-minute countdown.<br>4. Stop typing immediately when the timer buzzer sounds. |
| **Audience Role** | The audience can see the screens facing them; audience members act as spotters to call out anyone who leaves the editor. |

---

## 5. Live Hosting & Deployment

The project is hosted on Vercel and linked directly to your GitHub repository:
- **Production URL:** `https://11-11-chapter-2-codeinthedark.vercel.app`
- **Contestant Editor URL:** `https://11-11-chapter-2-codeinthedark.vercel.app/editor/`
- **Audience Voting URL:** `https://11-11-chapter-2-codeinthedark.vercel.app/vote/`
- **Continuous Deployment:** Any commit pushed to the `master` branch of `https://github.com/adithyen/CodeInTheDark` automatically rebuilds and deploys instantly on Vercel.
