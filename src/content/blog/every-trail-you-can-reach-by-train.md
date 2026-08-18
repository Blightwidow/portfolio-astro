---
title: Every trail you can reach by train
subtitle: Building TrainRando from OpenStreetMap, an SNCF station list, and a longest-path solver
date: 2026-08-17
series:
  name: "Hiking by train"
  order: 2
---

# Every trail you can reach by train

Planning a car-free multi-day hike in France is a research project. The trail data lives in one place, the stations in another, the accommodation in a third, and nothing connects them. I spent an evening cross-referencing the GR59 against TER timetables to plan four days of walking, and at the end of it I had one itinerary and a strong urge to never do that again.

So I built the tool. It is called [**TrainRando**](https://rando.dammaretz.fr/), it covers every GR and GRP in France, and the pipeline behind it turned out to be far more interesting than the website.

![A single railway line running through green countryside in Alsace (photo by Hassan Anayi on Unsplash)](../../images/railway-countryside.webp)

## The question, stated precisely

"Which trails can I reach by train" is too vague to compute. The question I actually wanted answered was this:

> Given France's long-distance trails and its passenger rail network, enumerate every walkable section of **8 to 18 km** that both starts and ends at a train station.

That framing does a lot of work. It rules out trails that merely pass near a line. It produces sections you can actually walk in a day. And it makes the output a finite, checkable list rather than a vibe.

## Step one: the trails are free, and messy

France's GR and GRP routes are in OpenStreetMap, queryable through the Overpass API. Getting them is easy. Trusting them is not.

The failure modes I hit, in the order they bit me:

- **Geometry gaps.** A route comes back as a MultiLineString whose pieces do not quite touch. Naively connecting them draws a hiker straight across a valley, and the elevation profile turns into a cliff.
- **Spurious fragments.** Stray ways tagged into the relation, sometimes hundreds of meters off the real path.
- **Trails split at large gaps.** Some routes are genuinely discontinuous in the data, and pretending otherwise generates hikes that do not exist.
- **One route was simply too broken to ship.** I disabled GR 8 entirely rather than publish sections I did not believe in.

I want to be clear that this is not a complaint about OpenStreetMap. Volunteers mapped tens of thousands of kilometers of trail and gave it away. But **open data is an input, not an answer**, and most of the pipeline is the cost of taking that seriously. Every [hike detail page](https://rando.dammaretz.fr/) carries an open data disclaimer for exactly this reason.

## Step two: not every `railway=station` is a station

The obvious approach is to query OSM for `railway=station` and call those your endpoints. Do that and you get freight sidings, disused platforms, tram stops, and halts no passenger train has called at in years. Send a hiker there and their trip ends in a field.

The fix is to stop treating OSM as the authority for rail and use **SNCF's official passenger station list** instead, matching stations against it before they are allowed to anchor a hike. The [station autocomplete](https://rando.dammaretz.fr/) on the site is filtered the same way, so you cannot search your way into a station that does not serve passengers.

This is my favorite kind of bug, because the code was never wrong. The data model was: "station" and "station you can get off at" are different concepts that happen to share a name.

## Step three: the algorithm, and why the obvious one fails

With a clean trail and a set of valid stations along it, you need to cut the trail into sections. My first version walked the trail with a depth-first search, taking each valid station-to-station segment as it came.

It produced bad hikes. DFS commits early, so it would take a greedy 9 km section and leave a 26 km monster behind it with nowhere to stop, or chain a run of short hops that no one would walk as separate days.

The right framing is that this is an optimization over a path, not a traversal. Order the valid stations along the trail's linear geometry, then run **longest-path dynamic programming** over them: for each station, the best decomposition of the trail up to that point, given that every section must land in the 8 to 18 km window. It runs in linear time over the station list, and it produces the decomposition a human would have drawn.

Two extensions I did not anticipate needing:

- **Round trips**, because some GR routes are circular and the linear assumption breaks.
- **Cutting sections at the shortest walking junction**, so the trail is severed where a hiker would actually leave it for the station, not at the nearest point as the crow flies.

## Step four: metadata is most of the value

A section with two station names is not yet a hike. Each one gets slope-aware duration (a flat 15 km and a 15 km climb are not the same day), elevation profile, difficulty with tooltips explaining the classification, region and terrain tags, and nearby accommodation. Campsite and hotel popups carry the website, and bus stop popups carry **GTFS route names**, which matter for the bail-out planning I refuse to hike without.

The part I am most pleased with is boring: **offline maps**. The site serves a vector topo base (Protomaps, plus hillshade and contours) from Cloudflare R2, and a hybrid PMTiles pipeline packages base and grid tiles so a section can be downloaded to a phone before you leave. There is a QR code on each section page, so you scan it at the trailhead and walk into a valley with no signal holding the map you need. Rural France is exactly where cell coverage is worst and where all the good trails are.

## What the answer turned out to be

The thing I wanted from all of this was the list, and the list is longer than I expected. Once you stop requiring a car, a surprising share of France's long-distance network decomposes into day-length, station-to-station sections. Not everywhere, and the geography is uneven in ways worth their own article. **TODO: pull the final numbers from the pipeline (total GR/GRP km covered, number of generated sections, share of sections with rail at both ends, best and worst regions).**

The whole thing lives at [rando.dammaretz.fr](https://rando.dammaretz.fr/): a static Astro site on GitHub Pages, licensed CC BY-NC-SA, with the data pipeline in the open. It cost me a few weekends and nothing to run.

What frustrates me is that this did not require any privileged access. The trails were public, the station list was public, the timetables were public. The connection between them just did not exist, because no institution's mandate covers "help people walk between our stations". The data was sitting there the whole time.
