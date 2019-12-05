var currSeason = "2016-2017";
var currCounty = "";
var currWeek = 4;
var predictedCountyData;
var isCountySelected = false;
var selectedCounty;
var countyElement;
var nestedFluData
var map
var sliderWeek
var NYcounties = ['', 'LEWIS',
    'MONROE',
    'NASSAU',
    'ESSEX',
    'ULSTER',
    'HAMILTON',
    'WARREN',
    'STEUBEN',
    'SCHENECTADY',
    'GENESEE',
    'ALBANY',
    'SENECA',
    'WAYNE',
    'GREENE',
    'SCHOHARIE',
    'WYOMING'
    , 'NEW YORK'
    , 'ST. LAWRENCE'
    , 'RICHMOND'
    , 'FRANKLIN'
    , 'QUEENS'
    , 'DELAWARE'
    , 'JEFFERSON'
    , 'ONONDAGA'
    , 'CHEMUNG'
    , 'COLUMBIA'
    , 'OTSEGO'
    , 'MONTGOMERY'
    , 'CLINTON'
    , 'OSWEGO'
    , 'FULTON'
    , 'BRONX'
    , 'DUTCHESS'
    , 'ROCKLAND'
    , 'WESTCHESTER'
    , 'ORANGE'
    , 'TIOGA'
    , 'ONEIDA'
    , 'ORLEANS'
    , 'PUTNAM'
    , 'CORTLAND'
    , 'BROOME'
    , 'HERKIMER'
    , 'ERIE'
    , 'SCHUYLER'
    , 'RENSSELAER'
    , 'NIAGARA'
    , 'KINGS'
    , 'ONTARIO'
    , 'WASHINGTON'
    , 'ALLEGANY'
    , 'SARATOGA'
    , 'CHAUTAUQUA'
    , 'TOMPKINS'
    , 'MADISON'
    , 'LIVINGSTON'
    , 'YATES'
    , 'SULLIVAN'
    , 'CHENANGO'
    , 'CAYUGA'
    , 'SUFFOLK'
    , 'CATTARAUGUS'
]
NYcounties.sort()

const div = document.querySelector('#countyDropdown');

NYcounties.forEach(NYcounty => {
    div.innerHTML += `<a class="dropdown-item" href="javascript:filterCounty('${NYcounty}')">${NYcounty}</a>`;
})
var countyDropdown = d3.select("#selectCounty")
    .append("select")
    .on("change", filterCounty);

countyDropdown.selectAll("option")
    .data(NYcounties)
    .enter().append("option")
    .attr("value", function (d) {
        return d;
    })
    .text(function (d) {
        return d;
    });

document.getElementById("county").innerHTML = currCounty;
document.getElementById("season").innerHTML = currSeason;
document.getElementById("week").innerHTML = currWeek;

var mapDiv = document.getElementById("map");
var margin = { top: 50, right: 50, bottom: 50, left: 50 },
    width = mapDiv.offsetWidth - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

var svg = d3.select("#map").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)

var fluData = [];
var predictedFluData = [];
var populationData = [];
var nbrData = [];
var county_fips = [];
var weekData;
var selectedWeek = 40;
var selectedSeason = "2016-2017";

/* Initialize tooltip */
var tip = d3.tip()
    .attr('class', 'd3-tip').html(function (d) {
        var countyCode = d.properties["COUNTY"];
        return "Year: " + selectedSeason + "<br>Week: " + selectedWeek + "<br>County: " + weekData[parseInt("36" + countyCode)].county + "<br>Cases: " + weekData[parseInt("36" + countyCode)].count
    });

/* Invoke the tip in the context of your visualization */
svg.call(tip);

var logScale = d3.scaleLog()
    .range([0, 20])

var logColor = d3.scaleQuantize().domain([0, 20]).range(d3.schemeGnBu[9])

var color = d3.scaleQuantize()
    //.domain([0,10])    
    .range(d3.schemeGnBu[9]);


var gStep1 = d3
    .select('#weekSelector')
    .append('svg')
    .attr('width', 550)
    .attr('height', 80)
    .append('g')
    .attr('transform', 'translate(30,30)');


var promises = [
    d3.json("NYcounties.json"),
    d3.csv("influenza.csv", function (data) {
        fluData.push(data);
    }),
    d3.csv("predicted_flu.csv", function (data) {
        predictedFluData.push(data);
    }),
    d3.csv("population.csv", function (data) {
        populationData.push(data);
    }),
    d3.csv("adj_data.csv", function(data){
        nbrData.push(data);
    }),
    d3.csv("county_fips.csv", function(data){
        county_fips.push(data);
    })
]

Promise.all(promises).then(ready)

function ready([ny]) {
    //var fluDensityData = computeDensity(predictedFluData);

    createFipsCountyMapping();
    createNbrMapping();

    createLineGraph(fluData);
    createNbrLinegraph(fluData);

    console.log(predictedFluData);
    predictedCountyData = d3.nest()
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
        .object(predictedFluData);

    nestedFluData = d3.nest()
        .key(function (d) {
            //console.log(d.County);
            return d.Season;
        })
        .key(function (d) {
            return d.Week;
        })
        .key(function (d) {
            return d.FIPS;
        })
        .rollup(function (cases) {
            //console.log(cases[0].County);
            var count = d3.sum(cases, function (d) {
                return d.Count;
            });
            return { "county": cases[0].County, "count": count };
        })
        .object(predictedFluData); //prev: predictedFluData

    var new_york = topojson.feature(ny, {
        type: "GeometryCollection",
        geometries: ny.objects.cty036.geometries
    });

    // projection and path
    var projection = d3.geoAlbersUsa()
        .fitExtent([[0, 0], [width, height]], new_york);;

    var geoPath = d3.geoPath()
        .projection(projection);


    map = svg.append("g")
        .attr("class", "counties")
        .selectAll("path")
        .data(new_york.features)
        .enter().append("path")
        .attr("class", "boundary")
        .attr("d", geoPath)
        .on("mouseover", function (d) {
            if (currSeason == "2018-2019" && (currWeek >= 1 && currWeek <= 20)) {
                $('#myModal').modal('show');
                return;
            }
            var countyCode = d.properties["COUNTY"];
            currCounty = weekData[parseInt("36" + countyCode)].county;
            createLineGraph(fluData);
            createNbrLinegraph(fluData);
            d3.select(this)
                .style("stroke-width", "3px");
            tip.show(d);
        })
        .on("mouseout", function (d) {
            tip.hide(d);
            d3.select(this)
                .style("stroke-width", "0.5px");

            if (isCountySelected == true) {
                currCounty = selectedCounty;
                createLineGraph(fluData);
                createNbrLinegraph(fluData);
                countyElement
                    .style("stroke-width", "3px")
                    .style("stroke", "#c93329");
            }

        })
        .on("click", function (d) {
            if (currSeason == "2018-2019" && (currWeek >= 1 && currWeek <= 20)) {
                $('#myModal').modal('show');
                return;
            }
            if (currSeason == "2016-2017" && (currWeek >= 40 && currWeek <= 52)) {
                $('#myModal2').modal('show');
            }
            if (isCountySelected == true) {
                //deselect prev county
                countyElement.style("stroke-width", "0.5px")
                    .style("stroke", "black");
            }
            isCountySelected = true;
            var countyCode = d.properties["COUNTY"];
            selectedCounty = weekData[parseInt("36" + countyCode)].county;
            currCounty = selectedCounty;

            $("#selectCounty select").val(currCounty);

            d3.select(this).style("stroke-width", "3px")
                .style("stroke", "#c93329");

            countyElement = d3.select(this);
        })



    var seasons = Object.keys(nestedFluData).sort();

    var dropdown = d3.select("#yearSelector")
        .append("select")
        .attr("transform", "translate(30,30)")
        .on("change", dropDownChange);

    dropdown.selectAll("option")
        .data(seasons)
        .enter().append("option")
        .attr("value", function (d) {
            return d;
        })
        .text(function (d) {
            return d;
        });

    sliderWeek = 40;
    var sliderStep1 = d3
        .sliderBottom()
        .min(1)
        .max(33)
        .width(500)
        .step(1)
        .ticks(33)
        .tickFormat(function (d) {
            if (d > 13)
                return d - 13;
            else
                return d + 39;
        })
        .default(1)
        .on('onchange', week => {
            if (week > 13) {
                week = week - 13;
            }
            else {
                week = 39 + week;
            }
            var season = currSeason;
            sliderWeek = week;
            updateWeek(season, week);
        });

    gStep1.call(sliderStep1);

    var fluCounts = [];




    fluCounts = [];
    Object.values(nestedFluData["2016-2017"]).forEach(w => {
        Object.values(w).forEach(c => {
            fluCounts.push(c.count);
        })
    });


    color.domain(d3.extent(fluCounts));
    logScale.domain([1, d3.max(fluCounts)])



    updateWeek("2016-2017", 40);
    createLegend();


}
function updateWeek(season, week) {
    selectedSeason = season;
    selectedWeek = week;
    currWeek = week;


    weekData = nestedFluData[season][week];

    if (weekData != undefined) {
        map.attr("fill", function (d) {
            var countyCode = d.properties["COUNTY"];
            if (weekData[parseInt("36" + countyCode)] != undefined) {
                if (weekData[parseInt("36" + countyCode)].count == 0) {

                    return (logColor(0))
                }
                else {

                    var log = logScale(weekData[parseInt("36" + countyCode)].count)

                    return (logColor(log))

                }

                return color(weekData[parseInt("36" + countyCode)].count);
            }

            return "white";
        });
    }
    //data for week not available
    else {
        map.attr("fill", "white");
    }

    if (currCounty != "") {
        createLineGraph(fluData)
        createNbrLinegraph(fluData)
    }


}
function createLegend() {
    var width = 260;
    var length = color.range().length;

    svg.select(".legend").remove();

    var g = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20,20)");

    var legendGroup = g.selectAll("g")
        .data(logColor.range())
        .enter()
        .append("g")


    legendGroup.append("rect")
        .attr("height", 15)
        .attr("x", (d, i) => 25 * i)
        .attr("width", (d, i) => 25)
        .attr("fill", d => d);

    legendGroup.append("text")
        .attr("x", (d, i) => 25 * i)
        .attr("y", 30)
        .text((d) => Math.floor(logScale.invert(logColor.invertExtent(d)[0])))
        .style("font-size", 10)


    g.append("text")
        .attr("y", -6)
        .attr("fill", "black")
        .attr("text-anchor", "start")
        .text("Count of Flu Cases");

}
function filterCounty(countyName) {
    //var countyName = d3.select(this).property("value");
    var searchedCounty = d3.selectAll(".boundary")
        .filter(d => {
            if (d.properties.NAME.toLowerCase() == countyName.toLowerCase())
                return true;
        });

    if (currSeason == "2016-2017" && (currWeek >= 40 && currWeek <= 52)) {
        $('#myModal2').modal('show');
    }
    if (isCountySelected == true) {
        //deselect prev county
        countyElement.style("stroke-width", "0.5px")
            .style("stroke", "black");
    }
    isCountySelected = true;
    selectedCounty = countyName;
    currCounty = selectedCounty;
    createLineGraph(fluData);
    createNbrLinegraph(fluData);
    searchedCounty.style("stroke-width", "3px")
        .style("stroke", "#c93329");

    countyElement = searchedCounty;
}


function computeDensity(peopleData) {
    populationData = d3.nest()
        .key(function (d) {
            return d.county.toLowerCase().trim();
        })
        .object(populationData);

    console.log(populationData);
    var tempData = peopleData;
    tempData.forEach(x => {
        //console.log(x);
        if (populationData[x.County.toLowerCase()] != undefined) {
            var population = populationData[x.County.toLowerCase()][0].population;
            x.Count = ((x.Count / population) * 10000).toFixed(4);
            //console.log(population);
        }
        else {
            console.log(x.County.toLowerCase())
        }

    })
    console.log(tempData);
    return tempData;

}

function dropDownChange(season) {
    //var season = d3.select(this).property("value");
    console.log(season);
    currSeason = season;
    seasonData = nestedFluData[season];

    console.log(seasonData);
    fluCounts = [];
    Object.values(seasonData).forEach(w => {
        Object.values(w).forEach(c => {
            fluCounts.push(c.count);
        })
    });


    color.domain(d3.extent(fluCounts));
    logScale.domain([1, d3.max(fluCounts)])
    createLegend();

    if (seasonData != undefined) {
        updateWeek(season, sliderWeek);
    }
    if (currCounty != "") {
        createLineGraph(fluData)
        createNbrLinegraph(fluData)
    }

}
