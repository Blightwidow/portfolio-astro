Research a topic for a future blog article and produce a structured notes file.

**Topic**: $ARGUMENTS

Follow this process:

1. **Create the output file** at `src/content/blog/<slugified-topic>.md.bak` with frontmatter (`title`, `subtitle`, `date` set to today) and a placeholder structure.

2. **Understand the scope.** Based on the topic, identify 6-10 key subtopics or angles worth investigating (e.g. for a housing article: price trends, wage gap, policy attempts, generational divide, construction supply, etc.). List these as the research plan.

3. **Research each subtopic** using WebSearch and WebFetch. For each:
   - Find **specific numbers, statistics, and data points** from authoritative sources (government agencies, OECD, Eurostat, INSEE, peer-reviewed papers, official reports).
   - Record every data point as an **inline markdown link**: `([Source Name, Year](url))`. The URL lives right next to the stat so `write-article` never needs to re-fetch it.
   - Prefer stable URLs: DOI links, official report pages, institutional datasets. Verify URLs load correctly with WebFetch when possible.
   - Look for **cross-country comparisons** when relevant — the blog often contextualizes French data against EU/OECD peers.
   - Find counterarguments, failed policies, and surprising twists — the blog thrives on narrative tension, not just facts.

4. **Write the .bak file** with this structure:

```markdown
---
title: <Article title>
subtitle: <One-line subtitle>
date: <YYYY-MM-DD>
---

# <Article title>

Raw ideas:
- <Key argument or angle 1>
- <Key argument or angle 2>
- ...
- <Key angle N>

-------
# Research

## <Subtopic 1 heading>

### <Sub-subtopic if needed>

- **Key stat**: value ([Source Name, Year](https://direct-url-to-source))
- **Key stat**: value ([Source Name, Year](https://direct-url-to-source))
- Contextual note or comparison
- ...

## <Subtopic 2 heading>
...
```

5. **Quality checks before finishing:**
   - Every data point has a source as an inline markdown link: `([Source Name, Year](url))`
   - Aim for 15+ linked sources — the URL lives next to the data point, not in a separate table
   - Numbers are specific (not "a lot" but "€2.4 billion" or "+40%")
   - The "Raw ideas" section captures 5-8 opinionated angles, not just neutral topics
   - Cross-country comparisons are included where they add perspective
   - The file is self-contained: someone reading it months later can write an article without re-researching

6. **Report** a brief summary of what was found, what subtopics had the richest data, and any gaps where sources were thin.
