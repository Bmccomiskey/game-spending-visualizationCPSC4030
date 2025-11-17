
const margin = { top: 40, right: 30, bottom: 80, left: 60 };

export function drawGroupedBarChart(data, selector) {
    const container = d3.select(selector);
    const bounds = container.node().getBoundingClientRect();
    const width = bounds.width - margin.left - margin.right;
    const height = bounds.height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    //filter out "other" gender and any null/empty genres
    const filteredData = data.filter(d => 
        (d.Gender === "Male" || d.Gender === "Female") &&
        d.GameGenre && d.GameGenre.trim() !== ""
    );

    const groupedData = d3.rollup(filteredData,
        v => d3.sum(v, d => d.InAppPurchaseAmount),
        d => d.GameGenre, //group by genre
        d => d.Gender  //group by gender
    );

    //get all unique genres from the filtered data and sort them
    const genres = Array.from(groupedData.keys()).sort();
    
    const genders = ["Male", "Female"];

    let maxSpending = 0;
    const aggregatedData = [];
    
    for (const genre of genres) {
        const entry = { GameGenre: genre };
        const genderMap = groupedData.get(genre) || new Map();
        
        for (const gender of genders) {
            const value = genderMap.get(gender) || 0;
            entry[gender] = value;
            if (value > maxSpending) {
                maxSpending = value;
            }
        }
        aggregatedData.push(entry);
    }

    const x0 = d3.scaleBand()
        .domain(genres)
        .range([0, width])
        .paddingInner(0.1);

    const x1 = d3.scaleBand()
        .domain(genders)
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .domain([0, maxSpending])
        .range([height, 0])
        .nice(); //rounds the domain to nice numbers

    const color = d3.scaleOrdinal()
        .domain(genders)
        .range(["#5bA8D9", "#F7A8B8"]);

    //x axis labels (genres)
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
            .style("text-anchor", "end")
            .attr("transform", "rotate(-45)");
    
    //ticks and grid lines
    svg.append("g")
        .call(d3.axisLeft(y)
            .tickFormat(d3.format("~s"))
        )
        .selectAll(".tick line")
        .clone()
        .attr("x2", width)
        .attr("stroke-opacity", 0.1); //makes the grid lines lighter
    
    //y axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 15)
        .attr("x", 0 - (height / 2))
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Total In-App Purchase ($)");
    
    //groups the data and moves it to the x position of each genre
    const genreGroup = svg.append("g")
      .selectAll("g")
      .data(aggregatedData)
      .join("g")
        .attr("transform", d => `translate(${x0(d.GameGenre)}, 0)`);

    //draws the bars for each genre group
    genreGroup.selectAll("rect")
      .data(d => genders.map(key => ({key: key, value: d[key]})))
      .join("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key));
        
    //color legend
    const legend = svg.append("g")
        .attr("font-size", 10)
        .attr("text-anchor", "start")
        .selectAll("g")
        .data(genders)
        .join("g")
          .attr("transform", (d, i) => `translate(${i * 80}, ${-margin.top + 15})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", color);

    legend.append("text")
        .attr("x", 15)
        .attr("y", 9.5)
        .text(d => d);
}