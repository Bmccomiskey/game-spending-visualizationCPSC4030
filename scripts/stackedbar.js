
const margin = { top: 20, right: 30, bottom: 80, left: 60 };


export function drawStackedBar(data, selector) {
    const container = d3.select(selector);
    const bounds = container.node().getBoundingClientRect();
    const width = bounds.width - margin.left - margin.right;
    const height = bounds.height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const groupedData = d3.rollup(data,
        v => d3.sum(v, d => d.InAppPurchaseAmount),
        d => d.GameGenre, //group by genre
        d => d.SpendingSegment  //group by spendingsegment
    );

    const stackKeys = ["Whale", "Dolphin", "Minnow"];
    const genres = Array.from(groupedData.keys()).sort();

    //convert into an array of objects that stack() can use
    const aggregatedData = [];
    for (const genre of genres) {
        const entry = { GameGenre: genre };
        const segmentMap = groupedData.get(genre);
        
        for (const key of stackKeys) {
            entry[key] = segmentMap.get(key) || 0; //0 if segment doesn't exist for that genre
        }
        aggregatedData.push(entry);
    }

    //create the stacks
    const stack = d3.stack()
        .keys(stackKeys)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const series = stack(aggregatedData);
    
    const x = d3.scaleBand()
        .domain(genres)
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
        .range([height, 0])
        .nice(); //rounds to nice numbers

    const color = d3.scaleOrdinal()
        .domain(stackKeys)
        .range(["#e15759", "#f28e2c", "#4e79a7"]); // Red, Orange, Blue

    //x-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");
    
    //ticks and grid lines
    svg.append("g")
        .call(d3.axisLeft(y)
            .tickFormat(d3.format("~s"))
        )
        .selectAll(".tick line")
        .clone()
        .attr("x2", width)
        .attr("stroke-opacity", 0.1);

    //y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 15)
        .attr("x", 0 - (height / 2))
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("In-App Purchase Amount ($)");
    
    //draw the bars
    // d[1] is the top
    // d[0] is bottom
    // y(d[0]) - y(d[1]) is height
    svg.append("g")
        .selectAll("g")
        .data(series)
        .join("g")
            .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
            .attr("x", d => x(d.data.GameGenre))
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1])) 
            .attr("width", x.bandwidth());
}