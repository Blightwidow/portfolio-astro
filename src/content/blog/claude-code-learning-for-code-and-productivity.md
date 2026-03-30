---
title: Claude Code learnings
subtitle: How to boost your productivity writing code or any content while keeping control
date: 2026-04-01
---

# Claude Code learnings

**92% of developers** now use AI tools in some part of their workflow, according to [Index.dev](https://www.index.dev/blog/developer-productivity-statistics-with-ai-tools). GitHub Copilot, Cursor, Claude Code: the toolbox is overflowing and everchanging. Studies claim developers complete tasks [**55.8% faster**](https://arxiv.org/abs/2302.06590). McKinsey reports [**46% reduction**](https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/unleashing-developer-productivity-with-generative-ai) in routine coding time. Daily AI users merge [**60% more PRs**](https://www.getpanto.ai/blog/ai-coding-assistant-statistics). The headlines write themselves.

And yet, when METR ran a randomized controlled trial with 16 experienced open-source developers on codebases they knew well, AI made them [**19% slower**](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/), despite the developers themselves believing they were 20% faster.

So which is it? Having spent months using Claude Code across several personal projects (a chess engine, a music generator, this very blog), I believe the answer is neither. The productivity gain is real, but it's conditional. It depends entirely on how you set up the harness around the model, not on the model itself, and what you are trying to solve.

## The productivity paradox

### The numbers tell two stories

The optimistic case is hard to dismiss. PR cycle time at companies using Copilot dropped [**from 9.6 days to 2.4 days**](https://www.wearetenet.com/blog/github-copilot-usage-data-statistics), a 4x improvement. Google reports that [**25% of all new code**](https://fortune.com/2024/10/30/googles-code-ai-sundar-pichai/) is now AI-generated. Developers using AI tools are [**twice as likely**](https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/unleashing-developer-productivity-with-generative-ai) to report feeling happier and entering a "flow" state, with a [**17% reduction**](https://www.index.dev/blog/developer-productivity-statistics-with-ai-tools) in burnout risk. On average, developers save [**3.6 hours per week**](https://www.getpanto.ai/blog/ai-coding-assistant-statistics), roughly 187 hours a year.

The pessimistic case is equally hard to ignore. The METR study, using Cursor Pro with Claude 3.5/3.7 Sonnet on repositories averaging 22,000+ stars and 1M+ lines of code, found that developers accepted less than 44% of AI-generated code. [**66%**](https://survey.stackoverflow.co/2025/ai) of developers say their top frustration is AI solutions that are "almost right, but not quite." And **45%** say debugging AI code takes more time than debugging human code.

What I find most revealing is the perception gap. The METR participants forecasted a 24% speedup before starting. They reported feeling 20% faster during the study. The clock said 19% slower. We are collectively using tools we don't fully understand, and we're overestimating how much they help when the task gets hard.

### Trust is low, adoption is universal

Here's the irony: [**only 29%**](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/) of developers trust AI tools, down 11 points from 2024. Only **3%** "highly trust" them. Yet **95%** use them [weekly or more](https://newsletter.pragmaticengineer.com/p/ai-tooling-2026), and **51%** use them [daily](https://survey.stackoverflow.co/2025/ai). We're all using something we don't fully trust because the alternative, not using it, feels like falling behind.

## What actually works

### Small-scoped changes with context

This is where AI coding tools shine brightest. When the relevant files are already in context and the task is well-defined, Claude Code is remarkably effective. GitHub reports that Copilot now generates [**46% of code**](https://www.getpanto.ai/blog/github-copilot-statistics) written by developers using it, up to **61%** for Java. The suggestion acceptance rate hovers around [**30%**](https://www.secondtalent.com/resources/github-copilot-statistics/), meaning one in three suggestions is used directly.

In my chess engine [Oxide](https://github.com/Blightwidow/oxide-chess-engine), this pattern worked well for feature implementation. Adding small features that Claude could quickly test with both unit tests, but also overall benchmark was a great way to have a quick iteration with feedback before doing a proper larger test (SPRT) over several hours.

### Research and content creation

I find the non-code use cases underrated. Claude as a writing partner, not just a coding partner, is where I've seen some of the most consistent value.

For some project, I use `claude -p` to generate SEO-optimized content with structured prompts, credits... For this portfolio, I built `/research-article` and `/write-article` skills that systematize blog writing with source verification, voice matching, and quality gates. Joe Karlsson took this further, building a [full content pipeline](https://www.joekarlsson.com/blog/building-a-claude-code-blog-skill-what-i-learned-systematizing-content-creation/) that handles research, outline, draft, linting, image generation, and PR submission, all from a single slash command. My notes are following a similar mindset and pipeline.

The pattern is the same as code: small, well-scoped tasks with clear quality criteria outperform open-ended requests.

### Plans and structured thinking

**Use plan mode. I cannot stress this enough.**

Claude Code's plan mode lets you iterate on an approach before a single line of code is written, building context without wasting tokens on implementation you'll throw away. Both my chess engine and music generator set Claude's default mode to "plan" in `.claude/settings.local.json`, forcing exploration before implementation.

For Oxide, I maintain a `.claude/plans/` directory with a 2400-to-2800 Elo roadmap broken into 9 tiers and a movegen optimization plan in 4 phases. These files survive context compaction and guide multi-session work. As [Sankalp notes](https://sankalp.bearblog.dev/my-experience-with-claude-code-20-and-how-to-get-better-at-using-coding-agents/), plans and todo lists stored as markdown files act as "powerful attention-manipulation tools," keeping objectives in recent focus even when earlier conversation context is compressed away.

Addy Osmani recommends creating a `spec.md` covering requirements, architecture, data models, and testing, calling it ["doing a waterfall in 15 minutes."](https://addyosmani.com/blog/ai-coding-workflow/) I find that framing accurate. The upfront investment pays for itself many times over.

### Bug detection and self-improvement

Claude is remarkably good at reviewing code and spotting potential issues, often faster than I would. As Chris Dzombak [puts it](https://www.dzombak.com/blog/2025/08/getting-good-results-from-claude-code/), "asking the agent to perform a code review on its own work is surprisingly fruitful."

For Oxide, Claude helped build 1,065 lines of tests (perft verification, mate detection, search correctness, Zobrist hashing) and a 46-position benchmark suite that catches performance regressions. It also iteratively improved its own CLAUDE.md files, adding architecture documentation, command references, and conventions that prevent it from proposing changes that violate project invariants in future sessions.

I insist on "potential issues" rather than confirmed bugs. Claude can identify suspicious patterns, but on complex logic it can just as easily hallucinate problems that don't exist. Which brings us to what doesn't work.

## What doesn't work

### Complex bugs without strong feedback loops

Chess engine search bugs are subtle. Wrong pruning thresholds, incorrect evaluation terms, off-by-one errors in transposition table replacement. Claude would claim to fix these issues without actually fixing them. Without SPRT testing (1,800+ games per change providing objective ground truth), there was no way to know.

This is the METR perception gap in action. Claude operates in a perception bubble: it cannot self-assess correctness on complex logic. If you don't have fast, automated validation, you're trusting the tool's confidence, not its competence. And those are very different things.

The fix is not to stop using AI for debugging. It's to invest in the feedback loop first. If you don't have tests to validate the overall product or feature, start with that before asking Claude to fix anything.

### Cutting-edge optimization

Oxide's plans document 9 tiers of optimization from roughly 2400 to 2800 Elo. Early tiers (history malus, TT improvements) worked well. But at the frontier of engine strength, Claude proposes changes that are lateral moves or regressions, and won't recognize it.

If you tell it "improve this," it will attempt it even if the ceiling has been reached. You waste tokens and risk regressions. Organizations that don't manage this face real consequences: unmanaged AI code sees maintenance costs reach [**4x traditional levels by year two**](https://www.codebridge.tech/articles/the-hidden-costs-of-ai-generated-software-why-it-works-isnt-enough).

The lesson: Claude Code is not a replacement for domain expertise. It accelerates execution within boundaries you define. When the boundary is "make this better" without a clear definition of better, it will spin.

### Hallucinations and low-context research

In roughly [**20% of 576,000 examined code samples**](https://www.bleepingcomputer.com/news/security/ai-hallucinated-code-dependencies-become-new-supply-chain-risk/), AI recommended packages that don't exist, a phenomenon now called "slopsquatting." **43%** of those hallucinated package names [recur consistently](https://www.helpnetsecurity.com/2025/04/14/package-hallucination-slopsquatting-malicious-code/) across reruns, making them an exploitable supply chain risk.

I ran into this differently. My music generator runs on Apple Silicon with unified memory, uses niche AI models (ACE-Step-1.5), and requires a sequential model loading pattern (load, infer, save, unload) to avoid running out of memory. Claude lacks context about local hardware constraints. Without explicit context injection in CLAUDE.md and skills, it would try to load incompatible models and crash.

The fix: inject machine and environment context as defaults. Both my chess engine and music generator have extensive CLAUDE.md files that document not just code conventions but operational constraints.

## The harness is the multiplier

### Why it matters more than the model

This is the insight I keep coming back to. LangChain's coding agent jumped from [**52.8% to 66.5%**](https://www.nxcode.io/resources/news/what-is-harness-engineering-complete-guide-2026) on Terminal Bench 2.0 "by only changing the harness, not the model." The OpenAI Codex team found that "agents performed better within strict architectural boundaries enforced by linters and validators," building 1M+ lines of code with just 3 engineers averaging 3.5 merged PRs per engineer per day.

The data on unguided AI code is stark. AI-generated code introduces [**1.7x more critical and major defects**](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report) than human code. Bug density is [**23% higher**](https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/unleashing-developer-productivity-with-generative-ai) in projects where AI code is not reviewed by humans. Security pass rates remain [**stagnant at 55%**](https://www.veracode.com/blog/spring-2026-genai-code-security/) across AI models, with AI code [**1.88x more likely**](https://www.secondtalent.com/resources/ai-generated-code-quality-metrics-and-statistics-for-2026/) to introduce improper password handling and **2.74x** more likely to introduce XSS vulnerabilities.

But with proper review and testing, the gap closes. The harness (CLAUDE.md, hooks, linters, tests) is what turns a liability into a multiplier.

### CLAUDE.md as project memory

CLAUDE.md is hierarchical: a global `~/.claude/CLAUDE.md` for personal guidelines, a project root file for team standards, subdirectory files for component-specific rules. The [official guidance](https://code.claude.com/docs/en/best-practices) is to keep it concise: "For each line, ask 'Would removing this cause Claude to make mistakes?' If not, cut it."

My chess engine's CLAUDE.md includes build commands, SPRT testing methodology, complete module architecture, search techniques, and conventions. This prevents Claude from proposing changes that violate architectural invariants. My music generator's CLAUDE.md documents 32 command examples and the sequential model loading constraint. Without it, Claude would OOM the machine.

Chris Dzombak's [personal CLAUDE.md](https://www.dzombak.com/blog/2025/08/getting-good-results-from-claude-code/) includes principles like "incremental progress over large changes" and "maximum 3 attempts per issue before reassessing approach." These aren't just preferences, they're guardrails against the tool's worst tendencies.

### Hooks for automated guardrails

Claude Code offers [22+ hook event types](https://code.claude.com/docs/en/hooks-guide): SessionStart, PreToolUse, PostToolUse, Stop, FileChanged, and more. You can auto-format with Prettier after every file edit, block edits to protected files, re-inject critical context after compaction, or verify all tests pass before Claude finishes a task.

Both my chess engine and music generator enforce formatting and linting via Claude configuration. This isn't optional decoration. Strong, restrictive linting and typing ensure that Claude's output meets baseline quality without human intervention. Claude is also very good at absorbing linter output and iterating locally, making the feedback loop tight and automatic.

### Context management: the real bottleneck

All 18 frontier models exhibit measurable performance decline as context grows. [Chroma Research](https://research.trychroma.com/context-rot) found a [**30%+ accuracy drop**](https://www.morphllm.com/context-rot) when information appears in middle positions ("lost-in-the-middle" effect). Effective capacity is usually **60-70% of the advertised maximum**. And after roughly 35 minutes of continuous work, all agents show declining success rates, with task duration doubling quadrupling failure rates.

What I find striking is the signal ratio: a typical 20K-token context contains only about [**500 tokens of relevant code**](https://www.morphllm.com/context-rot), a 2.5% signal ratio. Token consumption shows 10x variance on equivalent tasks, driven entirely by search efficiency. Managing what the model sees is half the job.

Practical strategies that work for me: 

- Check context usage regularly and compact at 60% capacity on complex tasks. 
- Break features into roughly 500-line sub-task chunks. 
- Store plans as markdown files that survive compaction. 
- Use SessionStart hooks to re-inject critical context post-compaction.
- And don't start complicated work mid-conversation, fresh context is cheap, wasted context is expensive.

## The role shift: from coder to agent manager

After a month of using Claude Code, [Morten Vistisen](https://mortenvistisen.com/posts/one-month-with-claude-code) described shifting from hands-on coding to a product manager role: describing requirements while Claude handles implementation. He also flagged the downside: rapid output (thousands of lines in minutes) increased the review burden. More rigorous code reviews were needed, not fewer. Across the industry, it's a pattern that many companies are facing as they ramp up AI uses.

Chris Dzombak [created roughly 12 programs](https://www.dzombak.com/blog/2025/08/getting-good-results-from-claude-code/) he wouldn't have built otherwise, while maintaining the principle that "I believe I'm ultimately responsible for the code that goes into a PR with my name on it, regardless of how it was produced." That framing matters.

## Practical tips

If I had to distill everything into a checklist:

- **Cut your needs into small, testable chunks.** If you don't have tests to validate the feature, start there.
- **Use plan mode aggressively.** Iterate on the approach before writing code. It's the cheapest way to build context.
- **Double-check everything.** Claude is a good accelerant but it will hallucinate. Bold claims need verification.
- **Invest in linting and typing.** Strict, restrictive tooling catches errors automatically and gives Claude fast feedback to iterate on.
- **Ask open-ended questions sometimes.** "Where could this codebase improve?" surfaces areas you might have missed.
- **Watch out for large repositories.** More files mean slower tests, more context, and a weaker feedback loop. Scope your sessions accordingly.
- **Inject context proactively.** CLAUDE.md, skills, and hooks are not configuration files. They're the actual product you're building around the model.

## The uncomfortable conclusion

Claude Code has made me meaningfully more productive. I've built projects I wouldn't have attempted, written content I wouldn't have researched as thoroughly, and caught bugs I might have missed. The **4% of GitHub public commits** now [authored by Claude Code](https://newsletter.semianalysis.com/p/claude-code-is-the-inflection-point), projected to exceed 20% by end of 2026, suggests I'm not alone.

But the productivity is fragile. It depends on infrastructure I had to build (CLAUDE.md files, test suites, feedback loops, hooks, plans). It depends on knowing when to trust the output and when to verify it. It depends on accepting that the role has shifted from writing code to managing an agent, and that managing an agent well requires understanding the code deeply enough to judge it.

The developers in the METR study were 19% slower not because the tools are bad, but because the overhead of integrating AI output into a familiar codebase exceeded the time saved generating it. The harness wasn't there. The feedback loop wasn't tight enough. The trust calibration was off.

I believe the gap between the 55% faster headline and the 19% slower reality is entirely explained by the quality of the harness. The model is the easy part. The hard part is everything around it.
