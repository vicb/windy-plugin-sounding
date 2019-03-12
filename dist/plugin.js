"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(
/* Mounting options */
{
  "name": "windy-plugin-examples",
  "version": "0.4.0",
  "author": "Windyty, S.E.",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/windycom/windy-plugins"
  },
  "description": "Windy plugin system enables anyone, with basic knowledge of Javascript to enhance Windy with new functionality (default desc).",
  "displayName": "Graph as a plugin",
  "hook": "contextmenu",
  "dependencies": ["https://cdn.jsdelivr.net/npm/d3@5/dist/d3.min.js", "https://cdn.jsdelivr.net/npm/preact@8/dist/preact.min.js"],
  "className": "drop-down-window ",
  "classNameMobile": "drop-down-window down",
  "attachPoint": ".leaflet-popup-pane",
  "attachPointMobile": "#plugins"
},
/* HTML */
'<h3>Sounding forecast</h3> <div id="sounding-chart"></div> <section> <span data-ref="tcon"></span> <span data-ref="ccl"></span> <span data-ref="lcl"></span> </section> <section> <span data-ref="model"></span> <span data-ref="alt"></span> <span data-ref="modelAlt"></span> </section> <div class="iconfont clickable-size" data-ref="zoom">&#xe03d;</div>',
/* CSS */
'#windy-plugin-examples{font-size:12px;padding:.5em .7em;line-height:2;z-index:100;width:360px;height:440px;margin-left:-10px}#windy-plugin-examples h3{margin:0 0 .3em .6em}#windy-plugin-examples .closing-x{display:block}#windy-plugin-examples section{margin-left:10px;line-height:1.5}#windy-plugin-examples section span:not(:first-child){margin-left:1em}#windy-plugin-examples section:first-of-type{color:black}#windy-plugin-examples section:last-of-type{font-size:.9em}#windy-plugin-examples section [data-ref="modelAlt"].red{color:red}#windy-plugin-examples [data-ref="zoom"]{position:absolute;right:20px;bottom:15px;font-size:25px;color:#9d0300}@media only screen and (max-device-width:736px){#windy-plugin-examples{display:block;left:0;top:0;right:0;width:calc(100% - 20px);margin:10px}}#windy-plugin-examples .axis path,#windy-plugin-examples .axis line{fill:none;stroke:#000;shape-rendering:crispEdges}#windy-plugin-examples #sounding-chart{height:360px;position:relative}#windy-plugin-examples #sounding-chart svg{width:100%;height:100%}#windy-plugin-examples #sounding-chart .infoLine .dewpoint{fill:steelblue}#windy-plugin-examples #sounding-chart .infoLine .temp{fill:red}#windy-plugin-examples #sounding-chart .zoomButton{cursor:pointer}',
/* Constructor */
function () {
  var _this = this;

  var graph = W.require('windy-plugin-examples/soundingGraph');

  var _ = W.require('utils');

  var pluginDataLoader = W.require('pluginDataLoader');

  var map = W.require('map');

  var rs = W.require('rootScope');

  var options = {
    key: "RxcwkWO2XWsfEbdidcsskbyWqhToAwLx",
    plugin: "windy-plugin-examples"
  };
  var load = pluginDataLoader(options);
  var marker = null;

  this.onopen = function (latLonObject) {
    var lat, lon;

    if (!latLonObject) {
      var c = map.getCenter();
      lat = c.lat;
      lon = c.lng;
    } else {
      lat = latLonObject.lat;
      lon = latLonObject.lon;
    }

    var leafletCoords = {
      lng: lon,
      lat: lat
    },
        _map$latLngToLayerPoi = map.latLngToLayerPoint(leafletCoords),
        x = _map$latLngToLayerPoi.x,
        y = _map$latLngToLayerPoi.y;

    if (!rs.isMobile) {
      _this.node.style.position = "absolute";
      _this.node.style.left = "".concat(x - 15, "px");
      _this.node.style.top = "".concat(y + 15, "px");
    } else {
      var height = _this.node.clientHeight;
      map.center({
        lat: lat,
        lon: lon
      }, false).panBy([0, -0.5 * height + 50]);
    }

    if (marker) {
      marker.setLatLng(leafletCoords);
    } else {
      marker = L.marker(leafletCoords, {
        icon: map.myMarkers.pulsatingIcon,
        zIndexOffset: -300
      }).addTo(map);
    }

    initAndLoad(lat, lon);

    _this.node.oncontextmenu = _this.node.ondblclick = _this.node.onclick = function (ev) {
      return ev.stopPropagation();
    };
  };

  var initAndLoad = function initAndLoad(lat, lon) {
    var dataOptions = {
      model: "ecmwf",
      lat: lat,
      lon: lon
    };
    graph.init(_this.refs);
    Promise.all([load("forecast", dataOptions), load("airData", dataOptions)]).then(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          forecast = _ref2[0],
          airData = _ref2[1];

      graph.load(lat, lon, airData.data, forecast.data);
    });
  };

  this.onclose = function () {
    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }
  };
});
/*! */
// This page was transpiled automatically from examples/07-multiple-files-plugin/soundingGraph.mjs

W.define('windy-plugin-examples/soundingGraph', ['overlays', 'store', '$', 'utils', 'windy-plugin-examples/soundingUtils'], function (overlays, store, $, _, sUtils) {
  ;
  ;
  ;
  ;
  ;
  var containerEl = $("#sounding-chart");
  var chartWidth = containerEl.clientWidth - 80;
  var chartHeight = containerEl.clientHeight - 40;
  /** @jsx h */

  var _preact = preact,
      h = _preact.h,
      render = _preact.render; // Scale for chart

  var xScale, yScale;
  var xAxisScale, yAxisScale;
  var xAxis, yAxis;
  var tempLine;
  var dewPointLine;
  var Sounding;
  var root;
  var pointData = {
    lat: 0,
    lon: 0,
    elevation: 0,
    modelElevation: 0,
    tempRange: [0, 0],
    pressureRange: [0, 0],
    data: {}
  };
  var currentData = [];
  var convertTemp = overlays.temp.convertNumber;
  var convertWind = overlays.wind.convertNumber;
  var convertPressure = overlays.pressure.convertNumber; // Custom conversion of altitude
  // Can not use convertNumber, because it rounds altitude to 100m

  var convertAlt = function convertAlt(value) {
    return Math.round(overlays.cloudtop.metric === "ft" ? value * 3.28084 : value);
  };

  var init = function init() {
    if (xScale) {
      return;
    } // Scale for chart


    xScale = d3.scaleLinear().range([0, chartWidth]);
    yScale = d3.scaleLinear().range([chartHeight, 0]); // Scale for axis is different, because it can display custom units

    xAxisScale = d3.scaleLinear().range([0, chartWidth]);
    yAxisScale = d3.scaleLinear().range([chartHeight, 0]);
    xAxis = d3.axisBottom(xAxisScale).ticks(5, "-d");
    yAxis = d3.axisRight(yAxisScale).ticks(10, "d");
    var refTemp = d3.line().x(function (d) {
      return xScale(d.temp);
    }).y(function (d) {
      return yScale(d.gh);
    });
    tempLine = d3.line().x(function (d) {
      return xScale(d.temp) + chartHeight - yScale(d.gh);
    }).y(function (d) {
      return yScale(d.gh);
    });
    dewPointLine = d3.line().x(function (d) {
      return xScale(d.dewpoint) + chartHeight - yScale(d.gh);
    }).y(function (d) {
      return yScale(d.gh);
    });

    Sounding = function Sounding() {
      var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          data = _ref3.data;

      return h("svg", {
        id: "sounding"
      }, data ? h("g", {
        class: "chartArea",
        transform: "translate(10,15)"
      }, h("g", {
        class: "x axis",
        transform: "translate(0,".concat(chartHeight, ")"),
        ref: function ref(g) {
          return d3.select(g).call(xAxis);
        }
      }), h("g", {
        class: "y axis",
        y: chartHeight + 16,
        ref: function ref(g) {
          return d3.select(g).call(yAxis);
        }
      }), h("text", {
        class: "y label",
        opacity: "0.75",
        x: "0",
        y: "-4"
      }), h("rect", {
        class: "overlay",
        width: chartWidth,
        height: chartHeight,
        opacity: "0"
      }), h("path", {
        class: "temperature chart",
        fill: "none",
        stroke: "red",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "stroke-width": "1.5",
        d: tempLine(data)
      }), h("path", {
        class: "dewpoint chart",
        fill: "none",
        stroke: "steelblue",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "stroke-width": "1.5",
        d: dewPointLine(data)
      }), h("path", {
        class: "ref chart",
        fill: "none",
        stroke: "pink",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "stroke-width": "1.5",
        d: refTemp(data),
        "transform-origin": "".concat(xScale(data[0].temp), " ").concat(yScale(data[0].gh)),
        transform: "rotate(45)"
      })) : h("text", {
        x: "50%",
        y: "50%",
        "text-anchor": "middle"
      }, "No Data"));
    };

    root = render(h(Sounding, {
      display: "block"
    }), containerEl, root);
  }; // Compute the min and max temp and pressure over the forecast range


  function updateScales() {
    var minTemp = Number.MAX_VALUE;
    var maxTemp = Number.MIN_VALUE;
    var minGh = Number.MAX_VALUE;
    var maxGh = Number.MIN_VALUE;
    var minPressure = Number.MAX_VALUE;
    var maxPressure = Number.MIN_VALUE;

    var _loop = function _loop(ts) {
      var tsData = pointData.data[ts];
      tsData.forEach(function (d, index) {
        if (index == 0) {
          minGh = Math.min(minGh, d.gh);
          maxPressure = Math.max(maxPressure, d.pressure);
        }

        if (index == tsData.length - 1) {
          maxGh = Math.max(maxGh, d.gh);
          minPressure = Math.min(minPressure, d.pressure);
        } // pt.dewpoint <= pt.temp


        minTemp = Math.min(minTemp, d.dewpoint);
        maxTemp = Math.max(maxTemp, d.temp);
      });
    };

    for (var ts in pointData.data) {
      _loop(ts);
    } // TODO


    minTemp = -30 + 273;
    maxTemp = 30 + 273;
    xScale.domain([minTemp, maxTemp]);
    xAxisScale.domain([convertTemp(minTemp), convertTemp(maxTemp)]);
    yScale.domain([minGh, maxGh]);
    yAxisScale.domain([convertAlt(minGh), convertAlt(maxGh)]);
  } // Return the value of the parameter `name` at `level` for the given `tsIndex`


  function GetParam(airData, name, level, tsIndex) {
    if (name === "gh" && level == "surface") {
      return airData.header.modelElevation;
    }

    return airData.data["".concat(name, "-").concat(level)][tsIndex];
  } // Handler for data request


  var load = function load(lat, lon, airData, forecastData) {
    pointData.lat = lat;
    pointData.lon = lon; // Create a lookup for forecast

    var forecastsByTs = {};

    for (var d in forecastData.data) {
      forecastData.data[d].forEach(function (f) {
        return forecastsByTs[f.origTs] = f;
      });
    } // Re-arrange the airData
    // from
    // {
    //    temp-150h: [...]
    //    temp-surface: [...]
    //    hours: [...]
    //    ...
    // }
    // to
    // {
    //    [timestamp0]: {
    //      temp: ,
    //      wind: ,
    //      wind_dir: ,
    //      level: ,
    //    }, ...
    // }


    var timestamps = airData.data.hours;
    var elevation = airData.header.elevation;
    var modelElevation = airData.header.modelElevation;
    var paramNames = new Set();
    var paramLevels = new Set(); // Extracts parameter names and levels.

    for (var name in airData.data) {
      var m = name.match(/([^-]+)-(.+)h$/);

      if (m !== null) {
        paramNames.add(m[1]);
        paramLevels.add(Number(m[2]));
      }
    } // Filters the list of levels and add surface (-1).


    var levels = [-1].concat(_toConsumableArray(Array.from(paramLevels) // .filter(l => l > 400)
    .sort(function (a, b) {
      return Number(a) < Number(b) ? 1 : -1;
    })));
    var levelDataByTs = {};
    timestamps.forEach(function (ts, index) {
      levelDataByTs[ts] = [];
      levels.forEach(function (level) {
        var LevelName = level < 0 ? "surface" : "".concat(level, "h");
        var gh = GetParam(airData, "gh", LevelName, index);

        if (gh >= modelElevation) {
          // Precompute the wind object
          var windU = GetParam(airData, "wind_u", LevelName, index);
          var windV = GetParam(airData, "wind_v", LevelName, index);

          var wind = _.wind2obj([windU, windV]); // Forecasts have the pressure in Pa - we want hPa.


          var pressure = level < 0 ? Math.round(forecastsByTs[ts].pressure / 100) : level;
          levelDataByTs[ts].push({
            temp: GetParam(airData, "temp", LevelName, index),
            dewpoint: GetParam(airData, "dewpoint", LevelName, index),
            gh: GetParam(airData, "gh", LevelName, index),
            wind: wind.wind,
            wind_dir: wind.dir,
            pressure: pressure,
            forecast: forecastsByTs[ts]
          });
        }
      });
    });
    console.log(levelDataByTs);
    pointData.data = levelDataByTs;
    pointData.elevation = elevation;
    pointData.modelElevation = modelElevation;
    updateScales(pointData);
    store.on("timestamp", redraw);
    redraw();
  }; // Update the sounding


  var redraw = function redraw() {
    currentData = null;

    if (pointData.data) {
      var ts = store.get("timestamp"); // Find nearest hour

      var hours = Object.getOwnPropertyNames(pointData.data).sort(function (a, b) {
        return Number(a) < Number(b) ? -1 : 1;
      });
      var ts1, ts2;
      var idx = hours.findIndex(function (x) {
        return x >= ts;
      });

      if (idx > -1) {
        if (idx == 0) {
          ts1 = ts2 = hours[0];
        } else {
          ts1 = hours[idx - 1];
          ts2 = hours[idx];
        } // Interpolate between two nearest hours


        currentData = sUtils.interpolateArray(pointData.data[ts1], pointData.data[ts2], ts2 != ts1 ? (ts - ts1) / (ts2 - ts1) : 0);
      }
    }

    root = render(h(Sounding, {
      data: currentData,
      display: "block"
    }), containerEl, root);
  };

  return {
    load: load,
    init: init
  };
});
/*! */
// This page was transpiled automatically from examples/07-multiple-files-plugin/soundingUtils.mjs

W.define('windy-plugin-examples/soundingUtils', ['utils'], function (_) {
  ; // Remove data points with some null values

  function validateData(data) {
    var _loop2 = function _loop2(_i2) {
      var keys = Object.keys(data[_i2]);

      if (keys.find(function (key) {
        return data[_i2][key] == null;
      })) {
        data.splice(_i2, 1);
      } else {
        ++_i2;
      }

      i = _i2;
    };

    for (var i = 0; i < data.length;) {
      _loop2(i);
    }
  } // Bilinear interpolation between two data arrays


  function interpolateArray(data1, data2, w) {
    var data = [];
    data1.forEach(function (d1, i) {
      var pressure1 = d1.pressure;
      var d2 = i == 0 ? data2[0] : data2.find(function (d2) {
        return d2.pressure == pressure1;
      });

      if (d2) {
        data.push(interpolatePoint(d1, d2, w));
      }
    });
    return data;
  } // Bilinear interpolation between two data points


  function interpolatePoint(point1, point2, w) {
    var interp = {};
    var keys = Object.getOwnPropertyNames(point1);
    keys.forEach(function (key) {
      interp[key] = (1 - w) * point1[key] + w * point2[key];
    });
    return interp;
  } // Returns intersection of two line segments


  function intersection(line1, line2) {
    var _line = _slicedToArray(line1, 2),
        _line$ = _slicedToArray(_line[0], 2),
        x1 = _line$[0],
        y1 = _line$[1],
        _line$2 = _slicedToArray(_line[1], 2),
        x2 = _line$2[0],
        y2 = _line$2[1];

    var _line2 = _slicedToArray(line2, 2),
        _line2$ = _slicedToArray(_line2[0], 2),
        x3 = _line2$[0],
        y3 = _line2$[1],
        _line2$2 = _slicedToArray(_line2[1], 2),
        x4 = _line2$2[0],
        y4 = _line2$2[1];

    if (x2 - x1 == 0 && y2 - y1 == 0 || x4 - x3 == 0 && y4 - y3 == 0) {
      return null; // One of the lines has zero length
    }

    var d = (y2 - y1) * (x4 - x3) - (x2 - x1) * (y4 - y3);

    if (!d) {
      return null;
    } // Lines are parallel


    var t = ((x2 - x1) * (y3 - y1) + (y2 - y1) * (x1 - x3)) / d;

    if (t < 0 || t > 1) {
      return null;
    } // Intersection is out of line1


    var px = x3 + t * (x4 - x3);
    var py = y3 + t * (y4 - y3);
    var s = x2 - x1 ? (px - x1) / (x2 - x1) : (py - y1) / (y2 - y1);

    if (s < 0 || s > 1) {
      return null;
    } // Intersetion is out of line2


    return [px, py];
  } // Returns first intersection of polyline straight line


  function dataIntersection(line, polyline, getPoint) {
    for (var _i3 = 0; _i3 < polyline.length - 1; ++_i3) {
      var pt = intersection(line, [getPoint(polyline[_i3]), getPoint(polyline[_i3 + 1])]);

      if (pt) {
        return pt;
      }
    }

    return null;
  } // Inspired by airgram.mjs:windMark()


  function drawWindArrow(g, x, y, dir, speed) {
    var scale = 20;
    var windBarb = g.append("g").attr("class", "windbarb").attr("transform", "translate(".concat(x, ", ").concat(y, ")rotate(").concat(dir, ")")); // TODO(berchet): unit

    if (speed > 2) {
      windBarb.append("line").attr("stroke", "black").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", -scale);
      var arrow = Math.round(scale / 4);
      windBarb.append("polyline").attr("stroke", "black").attr("fill", "none").attr("points", "-".concat(arrow / 2, ",-").concat(arrow, " 0,0 ").concat(arrow / 2, ",-").concat(arrow)).attr("stroke-linejoin", "round");
    } else {
      // No wind
      // Outline circle
      windBarb.append("circle").style("stroke", "black").style("fill", "none").attr("cx", 0).attr("cy", 0).attr("r", 0.25 * scale); // Central dot

      windBarb.append("circle").style("stroke", "black").attr("cx", 0).attr("cy", 0).attr("r", 0.05 * scale);
    }
  }

  return {
    validateData: validateData,
    interpolateArray: interpolateArray,
    interpolatePoint: interpolatePoint,
    intersection: intersection,
    dataIntersection: dataIntersection,
    drawWindArrow: drawWindArrow
  };
});