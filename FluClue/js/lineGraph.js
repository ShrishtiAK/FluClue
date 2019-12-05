
//predicted values
//TODO: replace with predicted value
var predicted;
var linegraphData;
var linegraphDiv = document.getElementById("linegraph")


var xScale = d3.scalePoint()
    .rangeRound([0, width]);

var yScale = d3.scaleLinear()
    .range([height, 0]);


var line = d3.line()
    .x(function (d, i) { return xScale(getWeekID(d.week)); })
    .y(function (d) { return yScale(d.count); })
    .curve(d3.curveMonotoneX)

var linegraphSvg;
/* Initialize tooltip */
var predictedTooltip = d3.tip()
    .attr('class', 'd3-tip').html(function (d) {
        var predictedWeek = d.week;
        var actualWeekData = linegraphData.filter(x => {
            if (x.week == predictedWeek)
                return x;
        })
        if (actualWeekData.length == 1)
            return "Week: " + predictedWeek +
                "<br><br>Actual Count: " + actualWeekData[0].count +
                "<br><br>Predicted Count: " + d.count;
        else if (actualWeekData.length == 0) {
            return "Week: " + predictedWeek +
                "<br><br>Predicted Count: " + d.count;
        }
    });


var actualTooltip = d3.tip()
    .attr('class', 'd3-tip').html(function (d) {
        var actualWeek = d.week;
        var predictedWeekData = predicted.filter(x => {
            if (x.week == actualWeek)
                return x;
        })

        return "Week: " + actualWeek +
            "<br><br>Actual Count: " + d.count +
            "<br><br>Predicted Count: " + predictedWeekData[0].count;

    });

var predictedCount;
function createLineGraph(data) {
    if(currCounty == ""){
        document.getElementById("linegraph").innerHTML = "Please Select a County";
        return;
    }
        
    if (currSeason == "2018-2019" && (currWeek >= 1 && currWeek <= 20)) {
        $('#myModal').modal('show');
        return;
    }


    document.getElementById("county").innerHTML = currCounty;
    document.getElementById("season").innerHTML = currSeason;
    document.getElementById("week").innerHTML = currWeek;

    //get predicted count for current week
    var predictedSeasonData = predictedCountyData[currCounty][currSeason];
    predictedSeasonData = Object.keys(predictedSeasonData).map(i => predictedSeasonData[i]);
    predicted = predictedSeasonData.filter(d => {
        if (getWeekID(d.week) <= getWeekID(currWeek))
            return d;
    });
    predictedCount = predicted[predicted.length - 1].count;
 
    document.getElementById("linegraph").innerHTML = "";

    linegraphSvg = d3.select("#linegraph").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    /* Invoke the tip in the context of your visualization */
    linegraphSvg.call(predictedTooltip);
    linegraphSvg.call(actualTooltip);

    //console.log(data);
    var countyData = d3.nest()
        .key(function (d) {
            return d.County;
        })
        .key(function (d) {
            return d.Season;
        })
        .key(function (d) {
            return d.Week;
        })
        .rollup(function (cases) {
            var count = d3.sum(cases, function (d) {
                return d.Count;
            });
            return { "week": cases[0].Week, "count": count, "weekID": getWeekID(cases[0].Week) };
        })
        .object(data);

    linegraphData = countyData[currCounty][currSeason];

    linegraphData = Object.keys(linegraphData).map(i => linegraphData[i]);

    linegraphData.sort(function (a, b) {
        return a.weekID - b.weekID;
    })

    predicted.sort(function (a, b) {
        return a.weekID - b.weekID;
    })

    xScale.domain(d3.range(1, 34));

    linegraphSvg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale)
            .tickFormat(function (d) {
                if (d > 13)
                    return d - 13;
                else
                    return d + 39;
            })
        )

    var maxCount = d3.max(linegraphData.map(function (d) { return d.count; }))
    var maxPredictedCount = d3.max(predicted.map(function (d) { return d.count; }))
    yScale.domain([0, d3.max([maxCount, maxPredictedCount])])

    linegraphSvg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(yScale)); // Create an axis component with d3.axisLeft

    //plot data for weeks currWeek - 1
    linegraphData = linegraphData.filter(d => {
        if (+d.weekID < getWeekID(currWeek))
            return true;
    })


    linegraphSvg.append("path")
        .datum(linegraphData)
        .attr("class", "line")
        .attr("d", line);


    linegraphSvg.selectAll(".dot")
        .data(linegraphData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", function (d, i) { return xScale(getWeekID(d.week)) })
        .attr("cy", function (d) { return yScale(d.count) })
        .attr("r", 5)
        .on("mouseover", actualTooltip.show)
        .on("mouseout", actualTooltip.hide)


    linegraphSvg.append("path")
        .datum(predicted)
        .attr("class", "predictedLine")
        .attr("d", line);

    linegraphSvg.selectAll(".predicted")
        .data(predicted)
        .enter().append("circle")
        .attr("class", "predicted")
        .attr("cx", function (d, i) { return xScale(getWeekID(d.week)) })
        .attr("cy", function (d) { return yScale(d.count) })
        .attr("r", 5)
        .on("mouseover", predictedTooltip.show)
        .on("mouseout", predictedTooltip.hide)


    // text label for the x axis
    linegraphSvg.append("text")
        .attr("transform",
            "translate(" + (width / 2) + " ," +
            (height + margin.top) + ")")
        .style("text-anchor", "middle")
        .text("Week");

    // text label for the y axis
    linegraphSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Count of Flu Cases");

    //legend
    var legend = linegraphSvg
        .append('g')
        .attr("transform", "translate(" + (+width - 300) + ",-150)");

    legend.append("circle").attr("cx", 200).attr("cy", 130).attr("r", 5).style("fill", "#337ab7")
    legend.append("circle").attr("cx", 200).attr("cy", 160).attr("r", 5).style("fill", "#c93329")
    legend.append("text").attr("x", 220).attr("y", 130).text("Actual Count").style("font-size", "15px").attr("alignment-baseline", "middle")
    legend.append("text").attr("x", 220).attr("y", 160).text("Predicted Count").style("font-size", "15px").attr("alignment-baseline", "middle")

}

function getWeekID(week) {
    if (week >= 40 && week <= 52) {
        return +week - 39;
    }
    else {
        return +week + 13;
    }
}