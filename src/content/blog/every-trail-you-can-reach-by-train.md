---
title: Every trail you can reach by train
subtitle: Building TrainRando from OpenStreetMap, an SNCF station list, and a longest-path solver
date: 2026-08-18
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

> Given France's long-distance trails and its passenger rail network, enumerate every walkable section of **8 to 25 km** that both starts and ends at a train station.

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

The right framing is that this is an optimization over a path, not a traversal. Order the valid stations along the trail's linear geometry, then run **longest-path dynamic programming** over them: for each station, the best decomposition of the trail up to that point, given that every section must land in the 8 to 25 km window. It runs in linear time over the station list, and it produces the decomposition a human would have drawn.

Two constraints go into the same graph, and they are the ones that turn a list of segments into hikes I would actually walk:

- **Every intermediate station needs a hotel.** A three-day chain whose middle stop has nowhere to sleep is not a three-day chain.
- **Every step must be skippable.** An edge only exists if both of its endpoints are connected by the same mode: two train stations, or two bus stops on the same line. That is the bail-out rule from my [glam-hiking piece](/blog/glam-hiking-a-week-on-foot-with-a-fanny-pack/), written as a graph constraint. If you cannot leave a section the way you arrived at it, the algorithm will not offer it to you.

Two extensions I did not anticipate needing:

- **Round trips**, because some GR routes are circular and the linear assumption breaks.
- **Cutting sections at the shortest walking junction**, so the trail is severed where a hiker would actually leave it for the station, not at the nearest point as the crow flies.

## Step four: metadata is most of the value

A section with two station names is not yet a hike. Each one gets slope-aware duration (a flat 15 km and a 15 km climb are not the same day), elevation profile, difficulty with tooltips explaining the classification, region and terrain tags, and nearby accommodation. Campsite and hotel popups carry the website, and bus stop popups carry **GTFS route names**, which matter for the bail-out planning I refuse to hike without.

The part I am most pleased with is boring: **offline maps**. The site serves a vector topo base (Protomaps, plus hillshade and contours) from Cloudflare R2, and a hybrid PMTiles pipeline packages base and grid tiles so a section can be downloaded to a phone before you leave. There is a QR code on each section page, so you scan it at the trailhead and walk into a valley with no signal holding the map you need. Rural France is exactly where cell coverage is worst and where all the good trails are.

## What the answer turned out to be

The catalog covers **73 GR and GRP routes, about 41,000 km of trail**, with **1,082 passenger stations** sitting within 5 km of one of them. Plenty of rail, plenty of trail.

Run the decomposition and you get **436 station-to-station sections**, chaining into **157 multi-day hikes**. That is the good news. Here is the number that reframed the project for me: those sections account for **roughly 6,200 km, about 15% of the network**. Eighty-five percent of France's long-distance trail network cannot be walked in day-length pieces between two stations you can actually leave from.

**57 of the 73 routes** yield at least one walkable section. The other sixteen have stations near them and still produce nothing, because two stations 60 km apart are not a hike, they are a hitchhiking problem.

And the geography is brutally uneven:

| Region | Trail km | Sections | Sections per 1,000 km | Trail km inside a section |
| --- | --- | --- | --- | --- |
| Hauts-de-France | 1,939 | 50 | 25.8 | 37% |
| Île-de-France | 3,104 | 79 | 25.4 | 36% |
| Centre-Val de Loire | 1,614 | 26 | 16.1 | 25% |
| Provence-Alpes-Côte d'Azur | 2,635 | 31 | 11.8 | 15% |
| Grand Est | 4,918 | 49 | 10.0 | 14% |
| Nouvelle-Aquitaine | 5,195 | 27 | 5.2 | 8% |
| Occitanie | 3,920 | 17 | 4.3 | 7% |
| Bretagne | 4,252 | 16 | 3.8 | 5% |

The Paris basin is six times better served than Brittany. Brittany has **4,252 km of GR trail and 41 stations near it**, which produces sixteen sections: less than one walkable day per 250 km of trail. Occitanie, with the Pyrenees and some of the best walking in the country, manages seventeen.

What strikes me is which routes come out on top. The winners are not the famous mountain traverses, they are the pilgrimage and river routes: the Via Turonensis (33 sections), the Loire (32), the Grand Tour de Paris (25), the Tour de l'Île-de-France (24). Medieval walking corridors followed rivers and linked towns, and eighteen centuries later the railways did exactly the same thing. The trails that share a logic with the rail network are the ones you can still reach without a car.

The losers are the trails built to avoid all of that. La Routo, 399 km of transhumance route, has three stations near it and zero valid sections. The GR38 across Brittany: 357 km, two stations, nothing.

<!-- Methodology: figures recomputed from the live catalog (generated 2026-05-26) plus per-route geojson,
replicating processors/slice.py: 5 km station radius, 8-25 km steps, longest-path DP per component.
My reimplementation omits two pipeline constraints (intermediate hotel, transport-connected endpoints),
both of which only remove edges, so 436 sections is an upper bound. Stations projected to nearest trail
vertex and deduplicated within 200 m along the trail. One 190 km route has no region tag and is excluded
from the table. Rerun: scratchpad/analyze.py. -->

So the honest answer to "which trails can I reach by train" is: a real, usable 436 of them, and far fewer than the map led me to expect.

The whole thing lives at [rando.dammaretz.fr](https://rando.dammaretz.fr/): a static Astro site on GitHub Pages, licensed CC BY-NC-SA, with the data pipeline in the open. It cost me a few weekends and nothing to run.

What frustrates me is that this did not require any privileged access. The trails were public, the station list was public, the timetables were public. The connection between them just did not exist, because no institution's mandate covers "help people walk between our stations". The data was sitting there the whole time.
