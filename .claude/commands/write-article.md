Write a blog article from the raw notes/outline in the file at: $ARGUMENTS

Follow this process:

1. **Read the target file** to understand the raw content, topic, and any structure hints.

2. **Read 3-4 existing articles** in `src/content/blog/` to match the blog's established tone and style:
   - First person, conversational but informed ("I find", "I believe", "What strikes me")
   - Data-driven with numbers woven into narrative, not dumped in tables
   - Rhetorical questions to engage the reader
   - Bold for key figures and takeaways
   - Links to sources inline when available
   - If part of a series, link back to previous articles in the intro

3. **Research sources** using WebSearch/WebFetch to find authoritative URLs (DOI links, official pages) for any claims, studies, or statistics mentioned in the notes. Link them inline in the text naturally.

4. **Structure the article** with a clear narrative arc:
   - Use H2 (`##`) for 2-4 major thematic sections (acts of the story)
   - Use H3 (`###`) for subsections within those acts
   - Avoid flat structures where everything is H2
   - Build toward a twist, insight, or conclusion — don't just list facts
   - End with a reflective closing paragraph

5. **Preserve the frontmatter** (`title`, `subtitle`, `date`) from the original file. If missing, ask.

6. **Write the article** in place, replacing the raw notes entirely.

7. **Verify** by running `bun run build` to ensure it compiles correctly.
