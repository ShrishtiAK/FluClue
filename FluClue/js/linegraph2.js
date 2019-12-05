nbrCounties = [];

var countyFipsMapping;
var nbrTip = d3.tip()
    .attr('class', 'd3-tip').html(function (d) {
        return d;
    });

function createFipsCountyMapping() {
    countyFipsMapping = d3.nest()
        .key(function (d) {
            return d.fips;
        })
        .object(county_fips);

    Object.keys(countyFipsMapping).forEach(fips => {
        countyFipsMapping[fips] = countyFipsMapping[fips][0].name.toLowerCase();
    });
    console.log(countyFipsMapping);
}
var countyNbrs
function createNbrMapping() {
    countyNbrs = d3.nest()
        .key(function (d) {
            return countyFipsMapping[d.FIPS];
        })
        .object(nbrData);

    Object.keys(countyNbrs).forEach(county => {
        if (countyNbrs[county] == undefined)
            console.log(county)
        countyNbrs[county] = countyNbrs[county][0].Adjacents.substring(1, countyNbrs[county][0].Adjacents.length - 1).split(",");
    });
    Object.keys(countyNbrs).forEach(county => {
        countyNbrs[county] = countyNbrs[county].map(d => {
            return countyFipsMapping[d.trim()]
        })
    });
    //console.log(countyNbrs);
}

function createNbrLinegraph(data) {
    if (currCounty == "") {
        document.getElementById("linegraph").innerHTML = "Please Select a County";
        return;
    }

    if (currSeason == "2018-2019" && (currWeek >= 1 && currWeek <= 20)) {
        $('#myModal').modal('show');
        return;
    }


    //get predicted count for current week
    var predictedSeasonData = predictedCountyData[currCounty][currSeason];
    predictedSeasonData = Object.keys(predictedSeasonData).map(i => predictedSeasonData[i]);
    predicted = predictedSeasonData.filter(d => {
        if (getWeekID(d.week) <= getWeekID(currWeek))
            return d;
    });
    predictedCount = predicted[predicted.length - 1].count;

    document.getElementById("linegraph2").innerHTML = "";

    linegraphSvg2 = d3.select("#linegraph2").append("svg")
        .attr("width", width * 2 + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    /* Invoke the tip in the context of your visualization */
    linegraphSvg2.call(predictedTooltip);
    linegraphSvg2.call(actualTooltip);
    linegraphSvg2.call(nbrTip);

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
    var xScale2 = d3.scalePoint()
        .rangeRound([0, width * 2]);
    xScale2.domain(d3.range(1, 34));

    linegraphSvg2.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale2)
            .tickFormat(function (d) {
                if (d > 13)
                    return d - 13;
                else
                    return d + 39;
            })
        )

    var nbrs = countyNbrs[currCounty.toLowerCase()];
    var nbrMax = getNbrMaxCount(nbrs, countyData);
    //console.log(nbrs);
    

    var maxCount = d3.max(linegraphData.map(function (d) { return d.count; }))
    var maxPredictedCount = d3.max(predicted.map(function (d) { return d.count; }))

    yScale.domain([0, d3.max([maxCount, maxPredictedCount, nbrMax])])

    linegraphSvg2.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(yScale)); // Create an axis component with d3.axisLeft

    //plot data for weeks currWeek - 1
    linegraphData = linegraphData.filter(d => {
        if (+d.weekID < getWeekID(currWeek))
            return true;
    })

    createNbrLines(nbrs, countyData, linegraphSvg2)

    linegraphSvg2.append("path")
        .datum(linegraphData)
        .attr("class", "line")
        .attr("d", line);


    linegraphSvg2.selectAll(".dot")
        .data(linegraphData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", function (d, i) { return xScale(getWeekID(d.week)) })
        .attr("cy", function (d) { return yScale(d.count) })
        .attr("r", 5)
        .on("mouseover", actualTooltip.show)
        .on("mouseout", actualTooltip.hide)


    linegraphSvg2.append("path")
        .datum(predicted)
        .attr("class", "predictedLine")
        .attr("d", line);

    linegraphSvg2.selectAll(".predicted")
        .data(predicted)
        .enter().append("circle")
        .attr("class", "predicted")
        .attr("cx", function (d, i) { return xScale(getWeekID(d.week)) })
        .attr("cy", function (d) { return yScale(d.count) })
        .attr("r", 5)
        .on("mouseover", predictedTooltip.show)
        .on("mouseout", predictedTooltip.hide)


    // text label for the x axis
    linegraphSvg2.append("text")
        .attr("transform",
            "translate(" + ((width * 2) / 2) + " ," +
            (height + margin.top) + ")")
        .style("text-anchor", "middle")
        .text("Week");

    // text label for the y axis
    linegraphSvg2.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Count of Flu Cases");

    //legend
    var legend = linegraphSvg2
        .append('g')
        .attr("transform", "translate(" + (+width * 2 - 300) + ",-150)");

    legend.append("circle").attr("cx", 200).attr("cy", 130).attr("r", 5).style("fill", "#337ab7")
    legend.append("circle").attr("cx", 200).attr("cy", 160).attr("r", 5).style("fill", "#c93329")
    legend.append("circle").attr("cx", 200).attr("cy", 190).attr("r", 5).style("fill", "grey")
    legend.append("text").attr("x", 220).attr("y", 130).text("Actual Count").style("font-size", "15px").attr("alignment-baseline", "middle")
    legend.append("text").attr("x", 220).attr("y", 160).text("Predicted Count").style("font-size", "15px").attr("alignment-baseline", "middle")
    legend.append("text").attr("x", 220).attr("y", 190).text("Neighbor Count").style("font-size", "15px").attr("alignment-baseline", "middle")
}

function createNbrLines(nbrs, countyData, linegraphSvg2) {
    nbrs.forEach(nbr => {
        if (countyData[nbr.toUpperCase()] == undefined)
            console.log(nbr.toUpperCase())

        nbrData = countyData[nbr.toUpperCase()][currSeason];

        nbrData = Object.keys(nbrData).map(i => nbrData[i]);

        nbrData.sort(function (a, b) {
            return a.weekID - b.weekID;
        })

        nbrData = nbrData.filter(d => {
            if (+d.weekID < getWeekID(currWeek))
                return true;
        })

        linegraphSvg2.append("path")
            .datum(nbrData)
            .attr("class", "nbrLine")
            .attr("name", nbr.toUpperCase())
            .attr("d", line)
            .on("mouseover", function(d){
               
                nbrTip.show(nbr.toUpperCase());
                d3.select(this).style("stroke-width", "3px");
            })
            .on("mouseout", function(d){
                nbrTip.hide()
                d3.select(this).style("stroke-width", "1px");
            });
    })
}

function getNbrMaxCount(nbrs, countyData){
    var max = 0;
    nbrs.forEach(nbr => {
        if (countyData[nbr.toUpperCase()] == undefined)
            console.log(nbr.toUpperCase())
        nbrData = countyData[nbr.toUpperCase()][currSeason];
        nbrData = Object.keys(nbrData).map(i => nbrData[i]);
        max = d3.max([max,d3.max(nbrData.map(function (d) { return d.count; }))]);
    });
    return max;
}