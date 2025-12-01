const margin = { top: 20, right: 30, bottom: 50, left: 60 };

export function drawLineGraph(data, selector) {
    const container = d3.select(selector);
    const bounds = container.node().getBoundingClientRect();
    const width = bounds.width - margin.left - margin.right;
    const height = bounds.height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const tooltip = d3.select("#tooltip");
    const formatDollar = d3.format(",.2f");
    
    //get total spending per spendingsegment
    const segmentTotals = d3.rollup(data,
        v => d3.sum(v, d => d.InAppPurchaseAmount),
        d => d.Age,  //spending per age
        d => d.SpendingSegment  //spending per segment
    );

    //get total spending per age (all segments combined)
    const totalTotals = d3.rollup(data,
        v => d3.sum(v, d => d.InAppPurchaseAmount),
        d => d.Age
    );

    const ages = Array.from(totalTotals.keys())
        .filter(age => age >= 10) //filter ages
        .sort((a, b) => a - b);
    

    let aggregatedData = ages.map(age => {
        const segments = segmentTotals.get(age) || new Map();
        return {
            Age: age,
            totalWhale: segments.get("Whale"),   
            totalDolphin: segments.get("Dolphin"),
            totalMinnow: segments.get("Minnow"),
            totalAll: totalTotals.get(age) 
        };
    });

    //calculate moving average to smooth the jagged lines
    const windowSize = 5;
    const calcMean = (slice, key) => {
        const values = slice.map(s => s[key]).filter(v => v !== undefined && !isNaN(v));
        return d3.mean(values);
    };
    const smoothedData = aggregatedData.map((d, i, arr) => {
        const slice = arr.slice(Math.max(0, i - windowSize + 1), i + 1);
        
        return {
            Age: d.Age,
            totalWhale: calcMean(slice, "totalWhale"),
            totalDolphin: calcMean(slice, "totalDolphin"),
            totalMinnow: calcMean(slice, "totalMinnow"),
            totalAll: calcMean(slice, "totalAll")
        };
    });
    
    const x = d3.scaleLinear()
        .domain(d3.extent(smoothedData, d => d.Age))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(smoothedData, d => Math.max(d.totalAll, d.totalWhale))])
        .range([height, 0])
        .nice(); //rounds to nice numbers

    const color = d3.scaleOrdinal()
        .domain(["Whale", "Dolphin", "Minnow", "Total"])
        .range(["#e15759", "#4e79a7", "#f28e2c", "#333333"]);

    //x axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    //grid lines and ticks
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format("~s")))
        .selectAll(".tick line")
        .clone()
        .attr("x2", width)
        .attr("stroke-opacity", 0.1); // Light gridlines

    //x axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .text("Age");
    
    //y axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 15)
        .attr("x", 0 - (height / 2))
        .style("text-anchor", "middle")
        .text("Moving Avg. of Total Spending ($)");


    const lineWhale = d3.line()
        .x(d => x(d.Age))
        .y(d => y(d.totalWhale))
        .defined(d => d.totalWhale !== undefined && !isNaN(d.totalWhale));

    const lineDolphin = d3.line()
        .x(d => x(d.Age))
        .y(d => y(d.totalDolphin))
        .defined(d => d.totalDolphin !== undefined && !isNaN(d.totalDolphin));

    const lineMinnow = d3.line()
        .x(d => x(d.Age))
        .y(d => y(d.totalMinnow))
        .defined(d => d.totalMinnow !== undefined && !isNaN(d.totalMinnow));
    
    const lineTotal = d3.line()
        .x(d => x(d.Age))
        .y(d => y(d.totalAll))
        .defined(d => d.totalAll !== undefined && !isNaN(d.totalAll));

    const segmentToField = {
        "Whale": "totalWhale",
        "Dolphin": "totalDolphin",
        "Minnow": "totalMinnow",
        "Total": "totalAll"
    };

    const segments = ["Whale", "Dolphin", "Minnow", "Total"];

    segments.forEach(segment => {
        const field = segmentToField[segment];

        const seriesData = smoothedData
            .filter(d => d[field] !== undefined && !isNaN(d[field]))
            .map(d => ({
                Age: d.Age,
                value: d[field],
                segment
            }));

        svg.append("g")
            .selectAll("circle")
            .data(seriesData)
            .join("circle")
                .attr("cx", d => x(d.Age))
                .attr("cy", d => y(d.value))
                .attr("r", segment === "Total" ? 10 : 8)
                .attr("fill", "transparent")
                .attr("stroke", "none")
                .attr("pointer-events", "all")
                //hover tool tips
                .on("mouseover", (event, d) => {
                    tooltip
                        .style("opacity", 1)
                        .html(
                            `<strong>Segment:</strong> ${d.segment}<br/>
                             <strong>Age:</strong> ${d.Age}<br/>
                             <strong>Moving Avg:</strong> $${formatDollar(d.value)}`
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

    //whale line
    svg.append("path")
        .datum(smoothedData)
        .attr("class", "line-series")
        .attr("fill", "none")
        .attr("stroke", color("Whale"))
        .attr("stroke-width", 2)
        .attr("d", lineWhale)
        .attr("data-segment-mark", "Whale")
        .attr("data-default-opacity", 1);

    //dolphin line
    svg.append("path")
        .datum(smoothedData)
        .attr("class", "line-series")
        .attr("fill", "none")
        .attr("stroke", color("Dolphin"))
        .attr("stroke-width", 2)
        .attr("d", lineDolphin)
        .attr("data-segment-mark", "Dolphin")
        .attr("data-default-opacity", 1);

    //minnow line
    svg.append("path")
        .datum(smoothedData)
        .attr("class", "line-series")
        .attr("fill", "none")
        .attr("stroke", color("Minnow"))
        .attr("stroke-width", 2)
        .attr("d", lineMinnow)
        .attr("data-segment-mark", "Minnow")
        .attr("data-default-opacity", 1);

    //total line (dashed)
    svg.append("path")
        .datum(smoothedData)
        .attr("class", "line-series")
        .attr("fill", "none")
        .attr("stroke", color("Total"))
        .attr("stroke-dasharray", "4 2")
        .attr("stroke-width", 1.5)
        .attr("d", lineTotal)
        .attr("data-segment-mark", "Total")
        .attr("data-default-opacity", 1);

}