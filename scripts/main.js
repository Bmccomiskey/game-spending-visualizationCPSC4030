import { drawScatterPlot } from './scatterplot.js';
import { drawLineGraph } from './linegraph.js';
import { drawStackedBar, updateStackedBarActiveSegment } from './stackedbar.js';

let originalData = [];
let selectedGenres = new Set();  // null = all genres

d3.csv("mobile_game_inapp_purchases.csv").then(data => {
    data.forEach(d => {
        d.Age = +d.Age;
        d.InAppPurchaseAmount = +d.InAppPurchaseAmount;
        d.SessionCount = +d.SessionCount;
    });

    originalData = data;

    renderAll();            // initial draw
    setupLegendHighlight(); // wire up segment legend

    d3.select("#clear-filters-btn").on("click", () => {
        if (selectedGenres) {
            selectedGenres.clear();
        }
        renderAll();
    });
}).catch(error => {
    console.error("Error loading the CSV:", error);
});

//redraw all charts based on the current genre filter.
//when clicking a stacked bar it will filter all other data by that genre
function renderAll() {
    const usingFilter = selectedGenres.size > 0;

    const filteredData = usingFilter
        ? originalData.filter(d => selectedGenres.has(d.GameGenre))
        : originalData;

    //clear existing charts
    d3.select("#scatter-plot-vis").selectAll("*").remove();
    d3.select("#stacked-bar-vis").selectAll("*").remove();
    d3.select("#line-graph-vis").selectAll("*").remove();

    //redraw
    drawScatterPlot(filteredData, "#scatter-plot-vis");
    drawStackedBar(originalData, "#stacked-bar-vis", handleGenreClick); // always full data
    drawLineGraph(filteredData, "#line-graph-vis");

    //style the selected genres in the stacked bar
    updateGenreSelectionStyles();
    updateGenreFilterLabel();
}

function handleGenreClick(genre) {
    if (selectedGenres.has(genre)) {
        selectedGenres.delete(genre);  //toggle off
    } else {
        selectedGenres.add(genre);  //toggle on
    }

    renderAll();
}

function setupLegendHighlight() {
    const legendItems = d3.selectAll("#legend .legend-item");

    legendItems
        .on("mouseenter", function () {
            const segment = d3.select(this).attr("data-segment");
            highlightSegment(segment);
        })
        .on("mouseleave", function () {
            highlightSegment(null);
        });
}

function highlightSegment(activeSegment) {
    const dimOpacity = 0.15;

    //stacked bar overlay behavior
    updateStackedBarActiveSegment(activeSegment);
    updateSegmentFilterLabel(activeSegment);

    //scatterplot dots
    d3.selectAll("circle.scatter-point[data-segment-mark]")
        .transition()
        .duration(150)
        .style("opacity", function () {
            const sel = d3.select(this);
            const seg = sel.attr("data-segment-mark");
            const defaultOpacity = +sel.attr("data-default-opacity") || 0.7;

            if (!activeSegment) {
                return defaultOpacity;
            }
            return seg === activeSegment ? 1 : dimOpacity;
        });

    //line graph series
    d3.selectAll("path.line-series[data-segment-mark]")
        .transition()
        .duration(150)
        .style("opacity", function () {
            const sel = d3.select(this);
            const seg = sel.attr("data-segment-mark");
            const defaultOpacity = +sel.attr("data-default-opacity") || 1;

            if (!activeSegment) {
                return defaultOpacity;
            }

            //show only the active segment’s line
            return seg === activeSegment ? 1 : 0;
        });
}

function updateGenreSelectionStyles() {
    const bars = d3.selectAll("#stacked-bar-vis .base-rect");

    //no filter
    if (selectedGenres.size === 0) {
        bars
            .style("stroke", "none")
            .style("stroke-width", 0)
            .style("opacity", 1);
        return;
    }

    bars
        .style("stroke", function () {
            const genre = d3.select(this).attr("data-genre");
            return selectedGenres.has(genre) ? "#222" : "none";
        })
        .style("stroke-width", function () {
            const genre = d3.select(this).attr("data-genre");
            return selectedGenres.has(genre) ? 2 : 0;
        })
        .style("opacity", function () {
            const genre = d3.select(this).attr("data-genre");
            return selectedGenres.has(genre) ? 1 : 0.3;
        });
}

function updateGenreFilterLabel() {
    const label = d3.select("#genre-filter-label");
    if (label.empty()) return;

    if (!selectedGenres || selectedGenres.size === 0) {
        label.text("All genres");
    } else {
        const list = Array.from(selectedGenres).sort();
        label.text(list.join(", "));
    }
}

function updateSegmentFilterLabel(activeSegment) {
    const label = d3.select("#segment-filter-label");
    if (label.empty()) return;

    if (!activeSegment) {
        label.text("All segments (hover to highlight)");
    } else {
        label.text(activeSegment);
    }
}