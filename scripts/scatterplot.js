const margin = { top: 20, right: 30, bottom: 50, left: 60 };

export function drawScatterPlot(data, selector) {
    const container = d3.select(selector);
    const bounds = container.node().getBoundingClientRect();
    const width = bounds.width - margin.left - margin.right;
    const height = bounds.height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    //filters out null values and ages below 10
    const filteredData = data.filter(d => d.Age >= 10 && d.InAppPurchaseAmount > 0);

    const x = d3.scaleLinear()
        .domain([10, d3.max(filteredData, d => d.Age)]) // Start at 10
        .range([0, width]);

    //y axis uses a logarithmic scale to better visualize the data
    const y = d3.scaleLog()
        .domain([0.1, d3.max(filteredData, d => d.InAppPurchaseAmount)])
        .range([height, 0])
        .clamp(true);

    const color = d3.scaleOrdinal()
        .domain(["Minnow", "Dolphin", "Whale"])
        .range(["#f28e2c", "#4e79a7", "#e15759"]); // Orange, Blue, Red

    //x axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));
    
    //x axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Age");

    //y axis
    svg.append("g")
        .call(d3.axisLeft(y)
            .tickValues([1, 10, 50, 100, 500, 1000, 5000])
            .tickFormat(d3.format(","))
        )
        .selectAll(".tick line")
        .clone()
        .attr("x2", width)
        .attr("stroke-opacity", 0.1);

    //y axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 15)
        .attr("x", 0 - (height / 2))
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("In-App Purchase Amount ($)");

    //adds jitter so they arent all stacked and overlapping 
    const jitterWidth = 10; 
    svg.append("g")
        .selectAll("circle")
        .data(filteredData)
        .join("circle")
            .attr("cx", d => x(d.Age) + (Math.random() * jitterWidth - (jitterWidth / 2)))
            .attr("cy", d => y(d.InAppPurchaseAmount))
            .attr("r", 3.5)
            .style("fill", d => color(d.SpendingSegment))
            .style("opacity", 0.7)
            .style("stroke", "white")
            .style("stroke-width", 0.5);
}