// This is the main script that loads the data and calls all the visuals

import { drawScatterPlot } from './scatterplot.js';
import { drawLineGraph } from './linegraph.js';
import { drawStackedBar } from './stackedbar.js';
import { drawGroupedBarChart } from './groupedbar.js';

d3.csv("mobile_game_inapp_purchases.csv").then(data => {
    
    //changes from strings to numbers
    data.forEach(d => {
        d.Age = +d.Age;
        d.InAppPurchaseAmount = +d.InAppPurchaseAmount;
        d.SessionCount = +d.SessionCount;
    });

    drawScatterPlot(data, "#scatter-plot-vis");
    drawLineGraph(data, "#line-graph-vis");
    drawStackedBar(data, "#stacked-bar-vis");
    drawGroupedBarChart(data, "#grouped-bar-vis");

}).catch(error => {
    console.error("Error loading the CSV:", error);
});