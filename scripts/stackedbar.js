const margin = { top: 20, right: 30, bottom: 80, left: 60 };

let aggregatedDataGlobal = null;
let xGlobal = null;
let yGlobal = null;
let colorGlobal = null;
let heightGlobal = null;
let overlayGroupGlobal = null;

export function drawStackedBar(data, selector, onGenreClick) {
    const container = d3.select(selector);
    const bounds = container.node().getBoundingClientRect();
    const width = bounds.width - margin.left - margin.right;
    const height = bounds.height - margin.top - margin.bottom;
    heightGlobal = Math.max(0, height); // save for overlay

    const cleanData = data.filter(d => {
        const g = (d.GameGenre || "").trim().toLowerCase();
        return g !== "" && g !== "null";
    });

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#tooltip");
    const formatDollar = d3.format(",.2f");

    const stackOrder = ["Minnow", "Dolphin", "Whale"]; // default stack order

    const byGenreSegment = d3.rollup(
        cleanData,
        v => d3.sum(v, d => d.InAppPurchaseAmount),
        d => d.GameGenre,
        d => d.SpendingSegment
    );

    const aggregatedData = Array.from(byGenreSegment, ([genre, segMap]) => ({
        GameGenre: genre,
        Whale: segMap.get("Whale") || 0,
        Dolphin: segMap.get("Dolphin") || 0,
        Minnow: segMap.get("Minnow") || 0
    })).sort((a, b) => d3.ascending(a.GameGenre, b.GameGenre));

    aggregatedDataGlobal = aggregatedData; // save for overlay

    //scales & axes
    const x = d3.scaleBand()
        .domain(aggregatedData.map(d => d.GameGenre))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([
            0,
            d3.max(aggregatedData, d => d.Whale + d.Dolphin + d.Minnow)
        ])
        .nice()
        .range([height, 0]);

    xGlobal = x;
    yGlobal = y;

    const color = d3.scaleOrdinal()
        .domain(stackOrder)
        .range(["#f28e2c", "#4e79a7", "#e15759"]); // Minnow, Dolphin, Whale
    colorGlobal = color;

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "start")
        .attr("dx", "0.4em")
        .attr("dy", "0.2em");

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format("~s")))
        .selectAll(".tick line")
        .clone()
        .attr("x2", width)
        .attr("stroke-opacity", 0.1);

    svg.append("text")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .text("In-App Purchases Amount ($)");

    //base stacked bars (context)
    const stackGen = d3.stack().keys(stackOrder);
    const series = stackGen(aggregatedData);

    const layersGroup = svg.append("g").attr("class", "stack-base");

    const segmentGroups = layersGroup
        .selectAll("g.segment-layer")
        .data(series, d => d.key)
        .join("g")
        .attr("class", "segment-layer")
        .attr("fill", d => color(d.key));

    segmentGroups.each(function (seriesItem) {
        const segmentKey = seriesItem.key;
        const g = d3.select(this);

        const rects = g.selectAll("rect")
            .data(seriesItem, d => d.data.GameGenre)
            .join("rect")
            .attr("class", "base-rect")
            .attr("x", d => x(d.data.GameGenre))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            // tag for cross-chart highlighting
            .attr("data-segment-mark", segmentKey)
            .attr("data-default-opacity", 1)
            .attr("data-genre", d => d.data.GameGenre)
            .on("click", function (event, d) {
                if (onGenreClick) {
                    onGenreClick(d.data.GameGenre);
                }
            })
            // tooltips
            .on("mouseover", function (event, d) {
                const genre = d.data.GameGenre;
                const value = d.data[segmentKey] || 0;

                tooltip
                    .style("opacity", 1)
                    .html(
                        `<strong>Genre:</strong> ${genre}<br/>
                         <strong>Segment:</strong> ${segmentKey}<br/>
                         <strong>Total Revenue:</strong> $${formatDollar(value)}`
                    );
            })
            .on("mousemove", (event) => {
                const xPos = event.clientX + window.scrollX;
                const yPos = event.clientY + window.scrollY;
                tooltip
                    .style("left", (xPos + 12) + "px")
                    .style("top", (yPos - 28) + "px");
            })
            .on("mouseleave", () => {
                tooltip.style("opacity", 0);
            });
    });

    //overlay group for "active" segment at x-axis
    overlayGroupGlobal = svg.append("g").attr("class", "segment-overlay");
}

/**
 * Draws an overlay bar for the active segment that sits on the x-axis
 * (like a normal bar chart), while the stacked bars stay in the background.
 */
export function updateStackedBarActiveSegment(activeSegment) {

    if (!overlayGroupGlobal || !aggregatedDataGlobal || !xGlobal || !yGlobal || !colorGlobal) {
        return;
    }

    const overlay = overlayGroupGlobal;
    const baseGroup = d3.select(".stack-base"); // the original stacked bars

    // Clear any previous overlay bars

    //no active segment: remove overlay
    if (!activeSegment) {
        baseGroup
            .transition()
            .duration(250)
            .style("opacity", 1);

        overlay.selectAll("rect")
            .transition()
            .duration(200)
            .attr("height", 0)
            .attr("y", yGlobal(0))
            .remove();

        return;
    }

    //hide stacked bars smoothly when a segment is active
    baseGroup
        .transition()
        .duration(250)
        .style("opacity", 0);

    const segment = activeSegment;

    const overlayRects = overlay.selectAll("rect")
        .data(aggregatedDataGlobal, d => d.GameGenre);

    const overlayEnter = overlayRects.enter()
        .append("rect")
        .attr("class", "overlay-rect")
        .attr("x", d => xGlobal(d.GameGenre))
        .attr("width", xGlobal.bandwidth())
        .attr("y", yGlobal(0))
        .attr("height", 0)
        .attr("fill", colorGlobal(segment))
        .attr("opacity", 0.95)
        .attr("pointer-events", "none")
        .attr("data-segment-mark", segment)
        .attr("data-default-opacity", 0.95);

    overlayRects.exit().remove();

    overlayEnter.merge(overlayRects)
        .transition()
        .duration(250)
        .attr("x", d => xGlobal(d.GameGenre))
        .attr("width", xGlobal.bandwidth())
        .attr("y", d => yGlobal(d[segment]))
        .attr("height", d => {
            const h = heightGlobal - yGlobal(d[segment]);
            return h > 0 ? h : 0;  // clamp at 0 to avoid negative height
        })
        .attr("fill", colorGlobal(segment))
        .attr("data-segment-mark", segment);

}