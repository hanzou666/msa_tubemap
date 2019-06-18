/*
MIT License

Copyright (c) 2017 Wolfgang Beyer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.tubemap = mod.exports;
  }
})(this, function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.create = create;
  exports.changeTrackVisibility = changeTrackVisibility;
  exports.changeExonVisibility = changeExonVisibility;
  exports.setMergeNodesFlag = setMergeNodesFlag;
  exports.setSoftClipsFlag = setSoftClipsFlag;
  exports.setShowReadsFlag = setShowReadsFlag;
  exports.setColorSet = setColorSet;
  exports.setNodeWidthOption = setNodeWidthOption;
  exports.useColorScheme = useColorScheme;
  exports.vgExtractNodes = vgExtractNodes;
  exports.vgExtractTracks = vgExtractTracks;
  exports.vgExtractReads = vgExtractReads;
  /* eslint no-param-reassign: "off" */
  /* eslint no-lonely-if: "off" */
  /* eslint no-prototype-builtins: "off" */
  /* eslint no-console: "off" */
  /* eslint no-continue: "off" */

  /* eslint max-len: "off" */
  /* eslint no-loop-func: "off" */
  /* eslint no-unused-vars: "off" */

  var DEBUG = false;

  var greys = ['#d9d9d9', '#bdbdbd', '#969696', '#737373', '#525252', '#252525', '#000000'];
  // const greys = ['#212121', '#424242', '#616161', '#757575', '#9e9e9e', '#bdbdbd', '#CFD8DC'];
  var blues = ['#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'];
  // const reds = ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'];
  var reds = ['#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'];
  var plainColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']; // d3 category10
  var lightColors = ['#ABCCE3', '#FFCFA5', '#B0DBB0', '#F0AEAE', '#D7C6E6', '#C6ABA5', '#F4CCE8', '#CFCFCF', '#E6E6AC', '#A8E7ED']; // d3 category10

  // const plainColors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00', '#b82e2e', '#316395']; // d3 google 10c
  // const plainColors = ['#1b5e20', '#0850B8', '#ff9800', '#039be5', '#f44336', '#9c27b0', '#8bc34a', '#5d4037', '#ffeb3b'];
  // const lightColors = ['#AAC3AB', '#A2BDE4', '#FFD89F', '#A1DAF5', '#FAA19B', '#DAAEE1', '#D4E9BB', '#AEA09B', '#FFF7B5'];

  var haplotypeColors = [];
  var forwardReadColors = [];
  var reverseReadColors = [];
  var exonColors = [];

  var svgID = void 0; // the (html-tag) ID of the svg
  var svg = void 0; // the svg
  var inputNodes = [];
  var inputTracks = [];
  var inputReads = [];
  var inputNodeCoverages = {};
  var inputMetaNodeCoverages = [];
  var nodes = void 0;
  var tracks = void 0;
  var reads = void 0;
  var nodeCoverages = void 0;
  var metaNodeCoverages = void 0;
  var numberOfNodes = void 0;
  var numberOfTracks = void 0;
  var nodeMap = void 0; // maps node names to node indices
  var nodesPerOrder = void 0;
  var assignments = []; // contains info about lane assignments sorted by order
  var extraLeft = []; // info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
  var extraRight = []; // info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
  var maxOrder = void 0; // horizontal order of the rightmost node

  var config = {
    mergeNodesFlag: true,
    clickableNodesFlag: false,
    showExonsFlag: false,
    colorScheme: 0,
    // Options for the width of sequence nodes:
    // 0...scale node width linear with number of bases within node
    // 1...scale node width with log2 of number of bases within node
    // 2...scale node width with log10 of number of bases within node
    nodeWidthOption: 0,
    showReads: true,
    showSoftClips: true,
    // haplotypeColors: 'plainColors',
    haplotypeColors: 'plainColors',
    forwardReadColors: 'reds',
    reverseReadColors: 'blues',
    exonColors: 'lightColors',
    hideLegendFlag: false,
    firstTrackLinear: false,
    fillNodesFlag: false
  };

  // variables for storing info which can be directly translated into drawing instructions
  var trackRectangles = [];
  var trackCurves = [];
  var trackCorners = [];
  var trackVerticalRectangles = []; // stored separately from horizontal rectangles. This allows drawing them in a separate step -> avoids issues with wrong overlapping
  var trackRectanglesStep3 = [];

  var maxYCoordinate = 0;
  var minYCoordinate = 0;
  var maxXCoordinate = 0;
  var trackForRuler = void 0;

  var bed = void 0;

  // main function to call from outside
  // which starts the process of creating a tube map visualization
  function create(params) {
    // mandatory parameters: svgID, nodes, tracks
    // optional parameters: bed, clickableNodes, reads, showLegend
    svgID = params.svgID;
    svg = d3.select(params.svgID);
    inputNodes = JSON.parse(JSON.stringify(params.nodes)); // deep copy
    inputTracks = JSON.parse(JSON.stringify(params.tracks)); // deep copy
    inputReads = params.reads || null;
    inputNodeCoverages = params.nodeCoverages;
    inputMetaNodeCoverages = params.metaNodeCoverages;
    bed = params.bed || null;
    config.clickableNodesFlag = params.clickableNodes || false;
    config.hideLegendFlag = params.hideLegend || false;
    config.firstTrackLinear = params.firstTrackLinear || false;
    config.fillNodesFlag = params.fillNodes || false;
    // config.haplotypeColors = haplotypeColors || 'plainColors';
    var tr = createTubeMap();
    if (!config.hideLegendFlag) drawLegend(tr);
  }

  // moves a specific track to the top
  function moveTrackToFirstPosition(index) {
    inputTracks.unshift(inputTracks[index]); // add element to beginning
    inputTracks.splice(index + 1, 1); // remove 1 element from the middle
    straightenTrack(0);
  }

  // straighten track given by index by inverting inverted nodes
  // only keep them inverted if this single track runs thrugh them in both directions
  function straightenTrack(index) {
    var i = void 0;
    var j = void 0;
    var nodesToInvert = [];
    var currentSequence = void 0;
    var nodeName = void 0;

    // find out which nodes should be inverted
    currentSequence = inputTracks[index].sequence;
    for (i = 0; i < currentSequence.length; i += 1) {
      if (currentSequence[i].charAt(0) === '-') {
        nodeName = currentSequence[i].substr(1);
        if (currentSequence.indexOf(nodeName) === -1 || currentSequence.indexOf(nodeName) > i) {
          // only if this inverted node is no repeat
          nodesToInvert.push(currentSequence[i].substr(1));
        }
      }
    }

    // invert nodes in the tracks' sequence
    for (i = 0; i < inputTracks.length; i += 1) {
      currentSequence = inputTracks[i].sequence;
      for (j = 0; j < currentSequence.length; j += 1) {
        if (currentSequence[j].charAt(0) !== '-') {
          if (nodesToInvert.indexOf(currentSequence[j]) !== -1) {
            currentSequence[j] = '-' + currentSequence[j];
          }
        } else if (nodesToInvert.indexOf(currentSequence[j].substr(1)) !== -1) {
          currentSequence[j] = currentSequence[j].substr(1);
        }
      }
    }

    // invert the sequence within the nodes
    inputNodes.forEach(function (node) {
      if (nodesToInvert.indexOf(node.name) !== -1) {
        node.seq = node.seq.split('').reverse().join('');
      }
    });
  }

  function changeTrackVisibility(trackID) {
    var i = 0;
    while (i < inputTracks.length && inputTracks[i].id !== trackID) {
      i += 1;
    }if (i < inputTracks.length) {
      if (inputTracks[i].hasOwnProperty('hidden')) {
        inputTracks[i].hidden = !inputTracks[i].hidden;
      } else {
        inputTracks[i].hidden = true;
      }
    }
    createTubeMap();
  }

  function changeExonVisibility() {
    config.showExonsFlag = !config.showExonsFlag;
    createTubeMap();
  }

  // sets the flag for whether redundant nodes should be automatically removed or not
  function setMergeNodesFlag(value) {
    if (config.mergeNodesFlag !== value) {
      config.mergeNodesFlag = value;
      svg = d3.select(svgID);
      createTubeMap();
    }
  }

  // sets the flag for whether read soft clips should be displayed or not
  function setSoftClipsFlag(value) {
    if (config.showSoftClips !== value) {
      config.showSoftClips = value;
      svg = d3.select(svgID);
      createTubeMap();
    }
  }

  // sets the flag for whether reads should be displayed or not
  function setShowReadsFlag(value) {
    if (config.showReads !== value) {
      config.showReads = value;
      svg = d3.select(svgID);
      createTubeMap();
    }
  }

  function setColorSet(trackType, colorSet) {
    config[trackType] = colorSet;
    var tr = createTubeMap();
    if (!config.hideLegendFlag) drawLegend(tr);
  }

  // sets which option should be used for calculating the node width from its sequence length
  function setNodeWidthOption(value) {
    if (value === 0 || value === 1 || value === 2 || value === 3) {
      if (config.nodeWidthOption !== value) {
        config.nodeWidthOption = value;
        if (svg !== undefined) {
          svg = d3.select(svgID);
          createTubeMap();
        }
      }
    }
  }

  // main
  function createTubeMap() {
    trackRectangles = [];
    trackCurves = [];
    trackCorners = [];
    trackVerticalRectangles = [];
    trackRectanglesStep3 = [];
    assignments = [];
    extraLeft = [];
    extraRight = [];
    maxYCoordinate = 0;
    minYCoordinate = 0;
    maxXCoordinate = 0;
    trackForRuler = undefined;
    svg = d3.select(svgID);
    svg.selectAll('*').remove(); // clear svg for (re-)drawing

    nodes = JSON.parse(JSON.stringify(inputNodes)); // deep copy (can add stuff to copy and leave original unchanged)
    tracks = JSON.parse(JSON.stringify(inputTracks));
    reads = JSON.parse(JSON.stringify(inputReads));
    if (inputNodeCoverages !== undefined) {
      nodeCoverages = JSON.parse(JSON.stringify(inputNodeCoverages));
      metaNodeCoverages = inputMetaNodeCoverages;
    }

    // if (reads && config.showReads) reads = reads.filter(read => (Math.abs(Number(read.sequence[0])) < 29));
    // if (reads && config.showReads) reads = reads.filter(read => (Math.abs(Number(read.sequence[0])) > 20));

    assignColorSets();

    for (var i = tracks.length - 1; i >= 0; i -= 1) {
      if (!tracks[i].hasOwnProperty('type')) {
        // TODO: maybe remove "haplo"-property?
        tracks[i].type = 'haplo';
      }
      if (tracks[i].hasOwnProperty('hidden')) {
        if (tracks[i].hidden === true) {
          tracks.splice(i, 1);
          break;
        }
      }
      if (tracks[i].hasOwnProperty('indexOfFirstBase')) {
        trackForRuler = tracks[i].name;
      }
    }

    nodeMap = generateNodeMap(nodes);
    generateTrackIndexSequences(tracks);
    if (reads && config.showReads) generateTrackIndexSequences(reads);
    generateNodeWidth();

    // if (reads && config.showReads) reads = reads.filter(read => ((read.sequence[0] === '1') || (read.sequence[0] === '2')));
    // if (reads && config.showReads) reads = reads.filter(read => (Math.abs(Number(read.sequence[0])) < 4));
    if (reads && config.mergeNodesFlag) {
      generateNodeSuccessors(); // requires indexSequence
      // if (reads && config.showReads) reads = reads.filter(read => ((read.sequence[0] === '1') || (read.sequence[0] === '2')));
      generateNodeOrder(); // requires successors
      if (reads && config.showReads) reverseReversedReads();
      mergeNodes();
      nodeMap = generateNodeMap(nodes);
      generateNodeWidth();
      generateTrackIndexSequences(tracks);
      if (reads && config.showReads) generateTrackIndexSequences(reads);
    }

    numberOfNodes = nodes.length;
    numberOfTracks = tracks.length;
    generateNodeSuccessors();
    generateNodeDegree();
    if (DEBUG) console.log(numberOfNodes + ' nodes.');
    generateNodeOrder();
    maxOrder = getMaxOrder();

    // can cause problems when there is a reversed single track node
    // OTOH, can solve problems with complex inversion patterns
    // switchNodeOrientation();
    // generateNodeOrder(nodes, tracks);
    // maxOrder = getMaxOrder();

    calculateTrackWidth(tracks);
    generateLaneAssignment();

    if (config.showExonsFlag === true && bed !== null) addTrackFeatures();
    generateNodeXCoords();

    if (reads && config.showReads) {
      // removeNonPathNodesFromReads();
      generateReadOnlyNodeAttributes();
      // reads = reads.slice(2, 3);
      reverseReversedReads();
      // reads = reads.filter(read => ((read.sequence[0] === '9') || (read.sequence[0] === '10')));
      // reads = reads.slice(0, 10);
      // reads = reads.filter(read => ((read.sequence[0] === '1')));
      // reads = reads.filter(read => ((read.sequence[0] === '1') || (read.sequence[0] === '2')));
      // reads = reads.filter(read => ((Number(read.sequence[0]) < 800)));
      generateTrackIndexSequences(reads);
      placeReads();
      // generateReadOnlyNodeAttributes();
      tracks = tracks.concat(reads);
    }

    generateSVGShapesFromPath(nodes, tracks);
    // removeUnusedNodes(nodes);
    // nodeMap = generateNodeMap(nodes);
    // console.log('Tracks:');
    // console.log(tracks);
    // console.log('Nodes:');
    // console.log(nodes);
    // console.log('Lane assignment:');
    // console.log(assignments);
    getImageDimensions();
    alignSVG(nodes, tracks);
    defineSVGPatterns();

    // console.log(trackRectangles);
    // console.log(trackRectanglesStep3);
    // console.log(trackCurves);
    drawTrackRectangles(trackRectangles);
    drawTrackCurves();
    drawReversalsByColor(trackCorners, trackVerticalRectangles);
    drawTrackRectangles(trackRectanglesStep3);
    drawTrackRectangles(trackRectangles, 'read');
    drawTrackCurves('read');

    // draw only those nodes which have coords assigned to them
    var dNodes = removeUnusedNodes(nodes);

    drawReversalsByColor(trackCorners, trackVerticalRectangles, 'read');
    drawNodes(dNodes, nodeCoverages, metaNodeCoverages);

    // generateTrackIndexSequences(tracks);

    if (config.nodeWidthOption === 0) drawLabels(dNodes);
    if (trackForRuler !== undefined) drawRuler();
    if (metaNodeCoverages !== undefined) drawYRuler();
    if (config.nodeWidthOption === 0) drawMismatches(); // TODO: call this before drawLabels and fix d3 data/append/enter stuff

    if (DEBUG) {
      console.log('number of tracks: ' + numberOfTracks);
      console.log('number of nodes: ' + numberOfNodes);
    }
    return tracks;
  }

  // generates attributes (node.y, node.contentHeight) for nodes without tracks, only reads
  function generateReadOnlyNodeAttributes() {
    nodesPerOrder = [];
    for (var i = 0; i <= maxOrder; i += 1) {
      nodesPerOrder[i] = [];
    }

    var orderY = new Map();
    nodes.forEach(function (node) {
      if (node.hasOwnProperty('order') && node.hasOwnProperty('y')) {
        if (orderY.has(node.order)) {
          orderY.set(node.order, Math.max(node.y + node.contentHeight, orderY.get(node.order)));
        } else {
          orderY.set(node.order, node.y + node.contentHeight);
        }
      }
    });

    nodes.forEach(function (node, i) {
      if (node.hasOwnProperty('order') && !node.hasOwnProperty('y')) {
        console.log('adding to ' + node.name);
        node.y = orderY.get(node.order) + 25;
        node.contentHeight = 0;
        nodesPerOrder[node.order].push(i);
      }
    });
  }

  // add info about reads to nodes (incoming, outgoing and internal reads)
  function assignReadsToNodes() {
    nodes.forEach(function (node) {
      node.incomingReads = [];
      node.outgoingReads = [];
      node.internalReads = [];
    });
    reads.forEach(function (read, idx) {
      read.width = 7;
      if (read.path.length === 1) {
        nodes[read.path[0].node].internalReads.push(idx);
      } else {
        read.path.forEach(function (element, pathIdx) {
          if (pathIdx === 0) {
            nodes[read.path[0].node].outgoingReads.push([idx, pathIdx]);
          } else if (read.path[pathIdx].node !== null) {
            nodes[read.path[pathIdx].node].incomingReads.push([idx, pathIdx]);
          }
        });
      }
    });
  }

  //
  function removeNonPathNodesFromReads() {
    reads.forEach(function (read) {
      for (var i = read.sequence.length - 1; i >= 0; i -= 1) {
        var nodeName = read.sequence[i];
        if (nodeName.charAt(0) === '-') {
          nodeName = nodeName.substr(1);
        }
        if (!nodeMap.has(nodeName) || nodes[nodeMap.get(nodeName)].degree === 0) {
          read.sequence.splice(i, 1);
        }
      }
    });
  }

  // calculate paths (incl. correct y coordinate) for all reads
  function placeReads() {
    generateBasicPathsForReads();
    assignReadsToNodes();

    // sort nodes by order, then by y-coordinate
    var sortedNodes = nodes.slice();
    sortedNodes.sort(compareNodesByOrder);

    // iterate over all nodes
    sortedNodes.forEach(function (node) {
      // sort incoming reads
      node.incomingReads.sort(compareReadIncomingSegmentsByComingFrom);

      // place incoming reads
      var currentY = node.y + node.contentHeight;
      var occupiedUntil = new Map();
      node.incomingReads.forEach(function (readElement) {
        reads[readElement[0]].path[readElement[1]].y = currentY;
        setOccupiedUntil(occupiedUntil, reads[readElement[0]], readElement[1], currentY, node);
        currentY += 7;
      });
      var maxY = currentY;

      // sort outgoing reads
      node.outgoingReads.sort(compareReadOutgoingSegmentsByGoingTo);

      // place outgoing reads
      var occupiedFrom = new Map();
      currentY = node.y + node.contentHeight;
      node.outgoingReads.forEach(function (readElement) {
        // place in next lane
        reads[readElement[0]].path[readElement[1]].y = currentY;
        occupiedFrom.set(currentY, reads[readElement[0]].firstNodeOffset);
        // if no conflicts
        if (!occupiedUntil.has(currentY) || occupiedUntil.get(currentY) + 1 < reads[readElement[0]].firstNodeOffset) {
          currentY += 7;
          maxY = Math.max(maxY, currentY);
        } else {
          // otherwise push down incoming reads to make place for outgoing Read
          occupiedUntil.set(currentY, 0);
          node.incomingReads.forEach(function (incReadElementIndices) {
            var incRead = reads[incReadElementIndices[0]];
            var incReadPathElement = incRead.path[incReadElementIndices[1]];
            if (incReadPathElement.y >= currentY) {
              incReadPathElement.y += 7;
              setOccupiedUntil(occupiedUntil, incRead, incReadElementIndices[1], incReadPathElement.y, node);
            }
          });
          currentY += 7;
          maxY += 7;
        }
      });

      // sort internal reads
      node.internalReads.sort(compareInternalReads);

      // place internal reads
      node.internalReads.forEach(function (readIdx) {
        var currentRead = reads[readIdx];
        currentY = node.y + node.contentHeight;
        while (currentRead.firstNodeOffset < occupiedUntil.get(currentY) + 2 || currentRead.finalNodeCoverLength > occupiedFrom.get(currentY) - 3) {
          currentY += 7;
        }currentRead.path[0].y = currentY;
        occupiedUntil.set(currentY, currentRead.finalNodeCoverLength);
        maxY = Math.max(maxY, currentY);
      });

      // adjust node height and move other nodes vertically down
      var heightIncrease = maxY - node.y - node.contentHeight;
      node.contentHeight += heightIncrease;
      adjustVertically3(node, heightIncrease);
    });

    // place read segments which are without node
    var bottomY = calculateBottomY();
    var elementsWithoutNode = [];
    reads.forEach(function (read, idx) {
      read.path.forEach(function (element, pathIdx) {
        if (!element.hasOwnProperty('y')) {
          elementsWithoutNode.push({ readIndex: idx, pathIndex: pathIdx, previousY: reads[idx].path[pathIdx - 1].y });
        }
      });
    });
    elementsWithoutNode.sort(compareNoNodeReadsByPreviousY);
    elementsWithoutNode.forEach(function (element) {
      var segment = reads[element.readIndex].path[element.pathIndex];
      segment.y = bottomY[segment.order];
      bottomY[segment.order] += reads[element.readIndex].width;
    });

    console.log('Reads:');
    console.log(reads);
  }

  // keeps track of where reads end within nodes
  function setOccupiedUntil(map, read, pathIndex, y, node) {
    if (pathIndex === read.path.length - 1) {
      // last node of current read
      map.set(y, read.finalNodeCoverLength);
    } else {
      // read covers the whole node
      map.set(y, node.sequenceLength);
    }
  }

  // compare read segments which are outside of nodes
  // by the y-coord of where they are coming from
  function compareNoNodeReadsByPreviousY(a, b) {
    var segmentA = reads[a.readIndex].path[a.pathIndex];
    var segmentB = reads[b.readIndex].path[b.pathIndex];
    if (segmentA.order === segmentB.order) {
      if (a.previousY !== undefined && b.previousY !== undefined) {
        return a.previousY - b.previousY;
      } else {
        return a.readIndex - b.readIndex;
      }
    }
    if (segmentA.order === segmentB.order) {
      return a.previousY - b.previousY;
    }
    return segmentA.order - segmentB.order;
  }

  // compare read segments by where they are going to
  function compareReadOutgoingSegmentsByGoingTo(a, b) {
    var pathIndexA = a[1];
    var pathIndexB = b[1];
    // let readA = reads[a[0]]
    // let nodeIndexA = readA.path[pathIndexA].node;
    var nodeA = nodes[reads[a[0]].path[pathIndexA].node];
    var nodeB = nodes[reads[b[0]].path[pathIndexB].node];
    while (nodeA !== null && nodeB !== null && nodeA === nodeB) {
      if (pathIndexA < reads[a[0]].path.length - 1) {
        pathIndexA += 1;
        while (reads[a[0]].path[pathIndexA].node === null) {
          pathIndexA += 1;
        } // skip null nodes in path
        nodeA = nodes[reads[a[0]].path[pathIndexA].node];
      } else {
        nodeA = null;
      }
      if (pathIndexB < reads[b[0]].path.length - 1) {
        pathIndexB += 1;
        while (reads[b[0]].path[pathIndexB].node === null) {
          pathIndexB += 1;
        } // skip null nodes in path
        nodeB = nodes[reads[b[0]].path[pathIndexB].node];
      } else {
        nodeB = null;
      }
    }
    if (nodeA !== null) {
      if (nodeB !== null) return compareNodesByOrder(nodeA, nodeB);
      return 1; // nodeB is null, nodeA not null
    }
    if (nodeB !== null) return -1; // nodeB not null, nodeA null
    // both nodes are null -> both end in the same node
    var beginDiff = reads[a[0]].firstNodeOffset - reads[b[0]].firstNodeOffset;
    if (beginDiff !== 0) return beginDiff;
    // break tie: both reads cover the same nodes and begin at the same position -> compare by endPosition
    return reads[a[0]].finalNodeCoverLength - reads[b[0]].finalNodeCoverLength;
  }

  // compare read segments by (y-coord of) where they are coming from
  function compareReadIncomingSegmentsByComingFrom(a, b) {
    // TODO: incoming from reversal (u-turn)
    var pathA = reads[a[0]].path[a[1] - 1];
    var pathB = reads[b[0]].path[b[1] - 1];
    if (pathB === undefined || pathA === undefined) {
      return 0;
    }
    if (pathA.hasOwnProperty('y')) {
      if (pathB.hasOwnProperty('y')) {
        return pathA.y - pathB.y; // a and b have y-property
      }
      return -1; // only a has y-property
    }
    if (pathB.hasOwnProperty('y')) {
      return 1; // only b has y-property
    }
    return compareReadIncomingSegmentsByComingFrom([a[0], a[1] - 1], [b[0], b[1] - 1]); // neither has y-property
  }

  // compare 2 reads which are completely within a single node
  function compareInternalReads(idxA, idxB) {
    var a = reads[idxA];
    var b = reads[idxB];
    // compare by first base within first node
    if (a.firstNodeOffset < b.firstNodeOffset) return -1;else if (a.firstNodeOffset > b.firstNodeOffset) return 1;

    // compare by last base within last node
    if (a.finalNodeCoverLength < b.finalNodeCoverLength) return -1;else if (a.finalNodeCoverLength > b.finalNodeCoverLength) return 1;

    return 0;
  }

  // determine biggest y-coordinate for each order-value
  function calculateBottomY() {
    var bottomY = [];
    for (var i = 0; i <= maxOrder; i += 1) {
      bottomY.push(0);
    }

    nodes.forEach(function (node) {
      bottomY[node.order] = Math.max(bottomY[node.order], node.y + node.contentHeight + 20);
    });

    tracks.forEach(function (track) {
      track.path.forEach(function (element) {
        bottomY[element.order] = Math.max(bottomY[element.order], element.y + track.width);
      });
    });
    return bottomY;
  }

  // generate path-info for each read
  // containing order, node and orientation, but no concrete coordinates
  function generateBasicPathsForReads() {
    var currentNodeIndex = void 0;
    var currentNodeIsForward = void 0;
    var currentNode = void 0;
    var previousNode = void 0;
    var previousNodeIsForward = void 0;
    var isPositive = function isPositive(n) {
      return ((n = +n) || 1 / n) >= 0;
    };

    reads.forEach(function (read) {
      // add info for start of track
      currentNodeIndex = Math.abs(read.indexSequence[0]);
      currentNodeIsForward = isPositive(read.indexSequence[0]);
      currentNode = nodes[currentNodeIndex];

      read.path = [];
      read.path.push({ order: currentNode.order, isForward: currentNodeIsForward, node: currentNodeIndex });

      for (var i = 1; i < read.sequence.length; i += 1) {
        previousNode = currentNode;
        previousNodeIsForward = currentNodeIsForward;

        currentNodeIndex = Math.abs(read.indexSequence[i]);
        currentNodeIsForward = isPositive(read.indexSequence[i]);
        currentNode = nodes[currentNodeIndex];

        if (currentNode.order > previousNode.order) {
          if (!previousNodeIsForward) {
            // backward to forward at previous node
            read.path.push({ order: previousNode.order, isForward: true, node: null });
          }
          for (var j = previousNode.order + 1; j < currentNode.order; j += 1) {
            // forward without nodes
            read.path.push({ order: j, isForward: true, node: null });
          }
          if (!currentNodeIsForward) {
            // forward to backward at current node
            read.path.push({ order: currentNode.order, isForward: true, node: null });
            read.path.push({ order: currentNode.order, isForward: false, node: currentNodeIndex });
          } else {
            // current Node forward
            read.path.push({ order: currentNode.order, isForward: true, node: currentNodeIndex });
          }
        } else if (currentNode.order < previousNode.order) {
          if (previousNodeIsForward) {
            // turnaround from fw to bw at previous node
            read.path.push({ order: previousNode.order, isForward: false, node: null });
          }
          for (var _j = previousNode.order - 1; _j > currentNode.order; _j -= 1) {
            // bachward without nodes
            read.path.push({ order: _j, isForward: false, node: null });
          }
          if (currentNodeIsForward) {
            // backward to forward at current node
            read.path.push({ order: currentNode.order, isForward: false, node: null });
            read.path.push({ order: currentNode.order, isForward: true, node: currentNodeIndex });
          } else {
            // backward at current node
            read.path.push({ order: currentNode.order, isForward: false, node: currentNodeIndex });
          }
        } else {
          // currentNode.order === previousNode.order
          if (currentNodeIsForward !== previousNodeIsForward) {
            read.path.push({ order: currentNode.order, isForward: currentNodeIsForward, node: currentNodeIndex });
          } else {
            read.path.push({ order: currentNode.order, isForward: !currentNodeIsForward, node: null });
            read.path.push({ order: currentNode.order, isForward: currentNodeIsForward, node: currentNodeIndex });
          }
        }
      }
    });
  }

  // reverse reads which are reversed
  function reverseReversedReads() {
    reads.forEach(function (read) {
      var pos = 0;
      while (pos < read.sequence.length && read.sequence[pos].charAt(0) === '-') {
        pos += 1;
      }if (pos === read.sequence.length) {
        // completely reversed read
        read.is_reverse = true;
        read.sequence = read.sequence.reverse(); // invert sequence
        for (var i = 0; i < read.sequence.length; i += 1) {
          read.sequence[i] = read.sequence[i].substr(1); // remove '-'
        }

        read.sequenceNew = read.sequenceNew.reverse(); // invert sequence

        var _loop = function _loop(_i) {
          read.sequenceNew[_i].nodeName = read.sequenceNew[_i].nodeName.substr(1); // remove '-'
          var nodeWidth = nodes[nodeMap.get(read.sequenceNew[_i].nodeName)].width;
          read.sequenceNew[_i].mismatches.forEach(function (mm) {
            if (mm.type === 'insertion') {
              mm.pos = nodeWidth - mm.pos;
              mm.seq = getReverseComplement(mm.seq);
            } else if (mm.type === 'deletion') {
              mm.pos = nodeWidth - mm.pos - mm.length;
            } else if (mm.type === 'substitution') {
              mm.pos = nodeWidth - mm.pos - mm.seq.length;
              mm.seq = getReverseComplement(mm.seq);
            }
            if (mm.hasOwnProperty('seq')) {
              mm.seq = mm.seq.split('').reverse().join('');
            }
          });
        };

        for (var _i = 0; _i < read.sequenceNew.length; _i += 1) {
          _loop(_i);
        }

        // adjust firstNodeOffset and finalNodeCoverLength
        var temp = read.firstNodeOffset;
        var seqLength = nodes[nodeMap.get(read.sequence[0])].sequenceLength;
        read.firstNodeOffset = seqLength - read.finalNodeCoverLength;
        seqLength = nodes[nodeMap.get(read.sequence[read.sequence.length - 1])].sequenceLength;
        read.finalNodeCoverLength = seqLength - temp;
      }
    });
  }

  function getReverseComplement(s) {
    var result = '';
    for (var i = s.length - 1; i >= 0; i -= 1) {
      switch (s.charAt(i)) {
        case 'A':
          result += 'T';
          break;
        case 'T':
          result += 'A';
          break;
        case 'C':
          result += 'G';
          break;
        case 'G':
          result += 'C';
          break;
        default:
          result += 'N';
      }
    }
    return result;
  }

  // for each track: generate sequence of node indices from seq. of node names
  function generateTrackIndexSequencesNEW(tracksOrReads) {
    tracksOrReads.forEach(function (track) {
      track.indexSequence = [];
      track.sequence.forEach(function (edit) {
        if (edit.nodeName.charAt(0) === '-') {
          track.indexSequence.push(-nodeMap.get(edit.nodeName.substr(1)));
        } else {
          track.indexSequence.push(nodeMap.get(edit.nodeName));
        }
      });
    });
  }

  // for each track: generate sequence of node indices from seq. of node names
  function generateTrackIndexSequences(tracksOrReads) {
    tracksOrReads.forEach(function (track) {
      track.indexSequence = [];
      track.sequence.forEach(function (nodeName) {
        if (nodeName.charAt(0) === '-') {
          track.indexSequence.push(-nodeMap.get(nodeName.substr(1)));
        } else {
          track.indexSequence.push(nodeMap.get(nodeName));
        }
      });
    });
  }

  // remove nodes with no tracks moving through them to avoid d3.js errors
  function removeUnusedNodes(allNodes) {
    var dNodes = allNodes.slice(0);
    var i = void 0;
    for (i = dNodes.length - 1; i >= 0; i -= 1) {
      // if (nodes[i].degree === 0) {
      if (!dNodes[i].hasOwnProperty('x')) {
        dNodes.splice(i, 1);
      }
    }
    // numberOfNodes = nodes.length;
    return dNodes;
  }

  // get the minimum and maximum coordinates used in the image to calculate image dimensions
  function getImageDimensions() {
    maxXCoordinate = -99;
    minYCoordinate = 99;
    maxYCoordinate = -99;

    nodes.forEach(function (node) {
      if (node.hasOwnProperty('x')) {
        maxXCoordinate = Math.max(maxXCoordinate, node.x + 20 + node.pixelWidth);
      }
      if (node.hasOwnProperty('y')) {
        minYCoordinate = Math.min(minYCoordinate, node.y - 10);
        maxYCoordinate = Math.max(maxYCoordinate, node.y + node.contentHeight + 10);
      }
    });

    tracks.forEach(function (track) {
      track.path.forEach(function (segment) {
        maxYCoordinate = Math.max(maxYCoordinate, segment.y + track.width);
        minYCoordinate = Math.min(minYCoordinate, segment.y);
      });
    });
  }

  // align visualization to the top and left within svg and resize svg to correct size
  function alignSVG() {
    // enable Pan + Zoom
    var zoom = d3.behavior.zoom().scaleExtent([0.1, 5]).on('zoom', function () {
      svg.attr('transform', 'translate(' + d3.event.translate + ') scale(' + d3.event.scale + ')');
    });
    svg = svg.call(zoom).on('dblclick.zoom', null).append('g');

    // translate so that top of drawing is visible
    zoom.translate([0, -minYCoordinate + 25]);
    zoom.event(svg);

    // resize svg depending on drawing size
    // this feels dirty, but changing the attributes of the 'svg'-Variable does not have the desired effect
    var svg2 = d3.select(svgID);
    svg2.attr('height', Math.min((maxYCoordinate - minYCoordinate + 50) * 1.5, 600));
    // svg2.attr('height', 800);
    svg2.attr('width', Math.max(maxXCoordinate, $(svgID).parent().width()));
  }

  // map node names to node indices
  function generateNodeMap() {
    nodeMap = new Map();
    nodes.forEach(function (node, index) {
      nodeMap.set(node.name, index);
    });
    return nodeMap;
  }

  // adds a successor-array to each node containing the indices of the nodes coming directly after the current node
  function generateNodeSuccessors() {
    var current = void 0;
    var follower = void 0;

    nodes.forEach(function (node) {
      node.successors = [];
      node.predecessors = [];
    });

    tracks.forEach(function (track) {
      for (var i = 0; i < track.indexSequence.length - 1; i += 1) {
        current = Math.abs(track.indexSequence[i]);
        follower = Math.abs(track.indexSequence[i + 1]);
        if (nodes[current].successors.indexOf(follower) === -1) {
          nodes[current].successors.push(follower);
        }
        if (nodes[follower].predecessors.indexOf(current) === -1) {
          nodes[follower].predecessors.push(current);
        }
      }
    });

    if (reads && config.showReads) {
      reads.forEach(function (track) {
        for (var i = 0; i < track.indexSequence.length - 1; i += 1) {
          current = Math.abs(track.indexSequence[i]);
          follower = Math.abs(track.indexSequence[i + 1]);
          if (nodes[current].successors.indexOf(follower) === -1) {
            nodes[current].successors.push(follower);
          }
          if (nodes[follower].predecessors.indexOf(current) === -1) {
            nodes[follower].predecessors.push(current);
          }
        }
      });
    }
  }

  function generateNodeOrderOfSingleTrack(sequence) {
    var forwardOrder = 0;
    var backwardOrder = 0;
    var currentNode = void 0;
    var minOrder = 0;

    sequence.forEach(function (nodeIndex) {
      if (nodeIndex < 0) {
        currentNode = nodes[Math.abs(nodeIndex)];
        if (!currentNode.hasOwnProperty('order')) {
          currentNode.order = backwardOrder;
        }
        if (currentNode.order < minOrder) minOrder = currentNode.order;
        forwardOrder = currentNode.order;
        backwardOrder = currentNode.order - 1;
      } else {
        currentNode = nodes[nodeIndex];
        if (!currentNode.hasOwnProperty('order')) {
          currentNode.order = forwardOrder;
        }
        forwardOrder = currentNode.order + 1;
        backwardOrder = currentNode.order;
      }
    });
    if (minOrder < 0) {
      increaseOrderForAllNodes(-minOrder);
    }
  }

  // calculate the order-value of nodes contained in sequence which are to the left of the first node which already has an order-value
  function generateNodeOrderTrackBeginning(sequence) {
    var anchorIndex = 0;
    var currentOrder = void 0;
    var currentNode = void 0;
    var minOrder = 0;
    var increment = void 0;

    while (anchorIndex < sequence.length && !nodes[Math.abs(sequence[anchorIndex])].hasOwnProperty('order')) {
      anchorIndex += 1; // anchor = first node in common with existing graph
    }
    if (anchorIndex >= sequence.length) {
      return null;
    }

    if (sequence[anchorIndex] >= 0) {
      // regular node
      currentOrder = nodes[sequence[anchorIndex]].order - 1;
      increment = -1;
    } else {
      // reverse node
      currentOrder = nodes[-sequence[anchorIndex]].order + 1;
      increment = 1;
    }

    for (var j = anchorIndex - 1; j >= 0; j -= 1) {
      // assign order to nodes which are left of anchor node
      currentNode = nodes[Math.abs(sequence[j])];
      if (!currentNode.hasOwnProperty('order')) {
        currentNode.order = currentOrder;
        minOrder = Math.min(minOrder, currentOrder);
        currentOrder += increment;
      }
    }

    if (minOrder < 0) {
      increaseOrderForAllNodes(-minOrder);
    }
    return anchorIndex;
  }

  // generate global sequence of nodes from left to right, starting with first track and adding other tracks sequentially
  function generateNodeOrder() {
    var modifiedSequence = void 0;
    var currentOrder = void 0;
    var currentNode = void 0;
    var rightIndex = void 0;
    var leftIndex = void 0;
    var minOrder = 0;
    var tracksAndReads = void 0;
    if (reads && config.showReads) tracksAndReads = tracks.concat(reads);else tracksAndReads = tracks;

    nodes.forEach(function (node) {
      delete node.order;
    });

    generateNodeOrderOfSingleTrack(tracks[0].indexSequence); // calculate order values for all nodes of the first track

    for (var i = 1; i < tracksAndReads.length; i += 1) {
      if (DEBUG) console.log('generating order for track ' + (i + 1));
      rightIndex = generateNodeOrderTrackBeginning(tracksAndReads[i].indexSequence); // calculate order values for all nodes until the first anchor
      if (rightIndex === null) {
        tracksAndReads.splice(i, 1);
        reads.splice(i - tracks.length, 1);
        i -= 1;
        continue;
      }
      modifiedSequence = uninvert(tracksAndReads[i].indexSequence);

      while (rightIndex < modifiedSequence.length) {
        // move right until the end of the sequence
        // find next anchor node
        leftIndex = rightIndex;
        rightIndex += 1;
        while (rightIndex < modifiedSequence.length && !nodes[modifiedSequence[rightIndex]].hasOwnProperty('order')) {
          rightIndex += 1;
        }if (rightIndex < modifiedSequence.length) {
          // middle segment between two anchors
          currentOrder = nodes[modifiedSequence[leftIndex]].order + 1; // start with order value of leftAnchor + 1
          for (var j = leftIndex + 1; j < rightIndex; j += 1) {
            nodes[modifiedSequence[j]].order = currentOrder; // assign order values
            currentOrder += 1;
          }

          if (nodes[modifiedSequence[rightIndex]].order > nodes[modifiedSequence[leftIndex]].order) {
            // if order-value of left anchor < order-value of right anchor
            if (nodes[modifiedSequence[rightIndex]].order < currentOrder) {
              // and the right anchor now has a lower order-value than our newly added nodes
              increaseOrderForSuccessors(modifiedSequence[rightIndex], modifiedSequence[rightIndex - 1], currentOrder);
            }
          } else {
            // potential node reversal: check for ordering conflict, if no conflict found move node at rightIndex further to the right in order to not create a track reversal
            // if (!isSuccessor(nodeMap.get(modifiedSequence[rightIndex]), nodeMap.get(modifiedSequence[leftIndex]))) { // no real reversal
            if (tracksAndReads[i].indexSequence[rightIndex] >= 0 && !isSuccessor(modifiedSequence[rightIndex], modifiedSequence[leftIndex])) {
              // no real reversal
              increaseOrderForSuccessors(modifiedSequence[rightIndex], modifiedSequence[rightIndex - 1], currentOrder);
            } else {
              // real reversal
              if (tracksAndReads[i].sequence[leftIndex] < 0 || nodes[modifiedSequence[leftIndex + 1]].degree < 2 && nodes[modifiedSequence[rightIndex]].order < nodes[modifiedSequence[leftIndex]].order) {
                currentOrder = nodes[modifiedSequence[leftIndex]].order - 1; // start with order value of leftAnchor - 1
                for (var _j2 = leftIndex + 1; _j2 < rightIndex; _j2 += 1) {
                  nodes[modifiedSequence[_j2]].order = currentOrder; // assign order values
                  currentOrder -= 1;
                }
              }
            }
          }
        } else {
          // right segment to the right of last anchor
          if (tracksAndReads[i].sequence[leftIndex] >= 0) {
            // elongate towards the right
            currentOrder = nodes[modifiedSequence[leftIndex]].order + 1;
            for (var _j3 = leftIndex + 1; _j3 < modifiedSequence.length; _j3 += 1) {
              currentNode = nodes[modifiedSequence[_j3]];
              if (!currentNode.hasOwnProperty('order')) {
                currentNode.order = currentOrder;
                currentOrder += 1;
              }
            }
          } else {
            // elongate towards the left
            currentOrder = nodes[modifiedSequence[leftIndex]].order - 1;
            for (var _j4 = leftIndex + 1; _j4 < modifiedSequence.length; _j4 += 1) {
              currentNode = nodes[modifiedSequence[_j4]];
              if (!currentNode.hasOwnProperty('order')) {
                currentNode.order = currentOrder;
                minOrder = Math.min(minOrder, currentOrder);
                currentOrder -= 1;
              }
            }
          }
        }
      }
    }

    // adjust all nodes if necessary, so that no order<0
    if (minOrder < 0) increaseOrderForAllNodes(-minOrder);
  }

  function isSuccessor(first, second) {
    var visited = new Array(numberOfNodes).fill(false);
    var stack = [];
    stack.push(first);
    visited[first] = true;
    while (stack.length > 0) {
      var current = stack.pop();
      if (current === second) return true;
      for (var i = 0; i < nodes[current].successors.length; i += 1) {
        var childIndex = nodes[current].successors[i];
        if (!visited[childIndex]) {
          visited[childIndex] = true;
          stack.push(childIndex);
        }
      }
    }
    return false;
  }

  // get order number of the rightmost node
  function getMaxOrder() {
    var max = -1;
    nodes.forEach(function (node) {
      if (node.hasOwnProperty('order') && node.order > max) max = node.order;
    });
    return max;
  }

  // generates sequence keeping the order but switching all reversed (negative) nodes to forward nodes
  function uninvert(sequence) {
    var result = [];
    for (var i = 0; i < sequence.length; i += 1) {
      if (sequence[i] >= 0) {
        result.push(sequence[i]);
      } else {
        result.push(-sequence[i]);
      }
    }
    return result;
  }

  // increases the order-value of all nodes by amount
  function increaseOrderForAllNodes(amount) {
    nodes.forEach(function (node) {
      if (node.hasOwnProperty('order')) node.order += amount;
    });
  }

  // increases the order-value for currentNode and (if necessary) successor nodes recursively
  function increaseOrderForSuccessors(startingNode, tabuNode, newOrder) {
    var increasedOrders = new Map();
    var queue = [];
    queue.push([startingNode, newOrder]);

    var _loop2 = function _loop2() {
      var current = queue.shift();
      var currentNode = current[0];
      var currentOrder = current[1];

      if (nodes[currentNode].hasOwnProperty('order') && nodes[currentNode].order < currentOrder) {
        if (!increasedOrders.has(currentNode) || increasedOrders.get(currentNode) < currentOrder) {
          increasedOrders.set(currentNode, currentOrder);
          nodes[currentNode].successors.forEach(function (successor) {
            if (nodes[successor].order > nodes[currentNode].order && successor !== tabuNode) {
              // only increase order of successors if they lie to the right of the currentNode (not for repeats/translocations)
              queue.push([successor, currentOrder + 1]);
            }
          });
          if (currentNode !== startingNode) {
            nodes[currentNode].predecessors.forEach(function (predecessor) {
              if (nodes[predecessor].order > currentNode.order && predecessor !== tabuNode) {
                // only increase order of predecessors if they lie to the right of the currentNode (not for repeats/translocations)
                queue.push([predecessor, currentOrder + 1]);
              }
            });
          }
        }
      }
    };

    while (queue.length > 0) {
      _loop2();
    }

    increasedOrders.forEach(function (value, key) {
      nodes[key].order = value;
    });
  }

  // calculates the node degree: the number of tracks passing through the node / the node height
  function generateNodeDegree() {
    nodes.forEach(function (node) {
      node.tracks = [];
    });

    tracks.forEach(function (track) {
      track.indexSequence.forEach(function (nodeIndex) {
        nodes[Math.abs(nodeIndex)].tracks.push(track.id);
      });
    });

    nodes.forEach(function (node) {
      if (node.hasOwnProperty('tracks')) node.degree = node.tracks.length;
    });
  }

  // if more tracks pass through a specific node in reverse direction than in
  // regular direction, switch its orientation
  // (does not apply to the first track's nodes, these are always oriented as
  // dictated by the first track)
  function switchNodeOrientation() {
    var toSwitch = new Map();
    var nodeName = void 0;
    var prevNode = void 0;
    var nextNode = void 0;
    var currentNode = void 0;

    for (var i = 1; i < tracks.length; i += 1) {
      for (var j = 0; j < tracks[i].sequence.length; j += 1) {
        nodeName = tracks[i].sequence[j];
        if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
        currentNode = nodes[nodeMap.get(nodeName)];
        if (tracks[0].sequence.indexOf(nodeName) === -1) {
          // do not change orientation for nodes which are part of the pivot track
          if (j > 0) {
            if (tracks[i].sequence[j - 1].charAt(0) !== '-') prevNode = nodes[nodeMap.get(tracks[i].sequence[j - 1])];else prevNode = nodes[nodeMap.get(tracks[i].sequence[j - 1].substr(1))];
          }
          if (j < tracks[i].sequence.length - 1) {
            if (tracks[i].sequence[j + 1].charAt(0) !== '-') nextNode = nodes[nodeMap.get(tracks[i].sequence[j + 1])];else nextNode = nodes[nodeMap.get(tracks[i].sequence[j + 1].substr(1))];
          }
          if ((j === 0 || prevNode.order < currentNode.order) && (j === tracks[i].sequence.length - 1 || currentNode.order < nextNode.order)) {
            if (!toSwitch.has(nodeName)) toSwitch.set(nodeName, 0);
            if (tracks[i].sequence[j].charAt(0) === '-') toSwitch.set(nodeName, toSwitch.get(nodeName) + 1);else toSwitch.set(nodeName, toSwitch.get(nodeName) - 1);
          }
          if ((j === 0 || prevNode.order > currentNode.order) && (j === tracks[i].sequence.length - 1 || currentNode.order > nextNode.order)) {
            if (!toSwitch.has(nodeName)) toSwitch.set(nodeName, 0);
            if (tracks[i].sequence[j].charAt(0) === '-') toSwitch.set(nodeName, toSwitch.get(nodeName) - 1);else toSwitch.set(nodeName, toSwitch.get(nodeName) + 1);
          }
        }
      }
    }

    tracks.forEach(function (track, trackIndex) {
      track.sequence.forEach(function (node, nodeIndex) {
        nodeName = node;
        if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
        if (toSwitch.has(nodeName) && toSwitch.get(nodeName) > 0) {
          if (node.charAt(0) === '-') tracks[trackIndex].sequence[nodeIndex] = node.substr(1);else tracks[trackIndex].sequence[nodeIndex] = '-' + node;
        }
      });
    });

    // invert the sequence within the nodes
    toSwitch.forEach(function (value, key) {
      if (value > 0) {
        currentNode = nodeMap.get(key);
        nodes[currentNode].seq = nodes[currentNode].seq.split('').reverse().join('');
      }
    });
  }

  // calculates the concrete values for the nodes' x-coordinates
  function generateNodeXCoords() {
    var currentX = 0;
    var nextX = 20;
    var currentOrder = -1;
    var sortedNodes = nodes.slice();
    sortedNodes.sort(compareNodesByOrder);
    var extra = calculateExtraSpace();

    sortedNodes.forEach(function (node) {
      if (node.hasOwnProperty('order')) {
        if (node.order > currentOrder) {
          currentOrder = node.order;
          currentX = nextX + 10 * extra[node.order];
        }
        node.x = currentX;
        nextX = Math.max(nextX, currentX + 40 + node.pixelWidth);
      }
    });
  }

  // calculates additional horizontal space needed between two nodes
  // two neighboring nodes have to be moved further apart if there is a lot going on in between them
  // -> edges turning to vertical orientation should not overlap
  function calculateExtraSpace() {
    var leftSideEdges = [];
    var rightSideEdges = [];
    var extra = [];

    for (var i = 0; i <= maxOrder; i += 1) {
      leftSideEdges.push(0);
      rightSideEdges.push(0);
    }

    tracks.forEach(function (track) {
      for (var _i2 = 1; _i2 < track.path.length; _i2 += 1) {
        if (track.path[_i2].order === track.path[_i2 - 1].order) {
          // repeat or translocation
          if (track.path[_i2].isForward === true) leftSideEdges[track.path[_i2].order] += 1;else rightSideEdges[track.path[_i2].order] += 1;
        }
      }
    });

    extra.push(Math.max(0, leftSideEdges[0] - 1));
    for (var _i3 = 1; _i3 <= maxOrder; _i3 += 1) {
      extra.push(Math.max(0, leftSideEdges[_i3] - 1) + Math.max(0, rightSideEdges[_i3 - 1] - 1));
    }
    return extra;
  }

  // create and fill assignment-variable, which contains info about tracks and lanes for each order-value
  function generateLaneAssignment() {
    var segmentNumber = void 0;
    var currentNodeIndex = void 0;
    var currentNodeIsForward = void 0;
    var currentNode = void 0;
    var previousNode = void 0;
    var previousNodeIsForward = void 0;
    var prevSegmentPerOrderPerTrack = [];
    var isPositive = function isPositive(n) {
      return ((n = +n) || 1 / n) >= 0;
    };

    // create empty variables
    for (var i = 0; i <= maxOrder; i += 1) {
      assignments[i] = [];
      prevSegmentPerOrderPerTrack[i] = [];
      for (var j = 0; j < numberOfTracks; j += 1) {
        prevSegmentPerOrderPerTrack[i][j] = null;
      }
    }

    tracks.forEach(function (track, trackNo) {
      // add info for start of track
      currentNodeIndex = Math.abs(track.indexSequence[0]);
      currentNodeIsForward = isPositive(track.indexSequence[0]);
      currentNode = nodes[currentNodeIndex];

      track.path = [];
      track.path.push({ order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeIndex });
      addToAssignment(currentNode.order, currentNodeIndex, trackNo, 0, prevSegmentPerOrderPerTrack);

      segmentNumber = 1;
      for (var _i4 = 1; _i4 < track.sequence.length; _i4 += 1) {
        previousNode = currentNode;
        previousNodeIsForward = currentNodeIsForward;

        currentNodeIndex = Math.abs(track.indexSequence[_i4]);
        currentNodeIsForward = isPositive(track.indexSequence[_i4]);
        currentNode = nodes[currentNodeIndex];

        if (currentNode.order > previousNode.order) {
          if (!previousNodeIsForward) {
            // backward to forward at previous node
            track.path.push({ order: previousNode.order, lane: null, isForward: true, node: null });
            addToAssignment(previousNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          }
          for (var _j5 = previousNode.order + 1; _j5 < currentNode.order; _j5 += 1) {
            // forward without nodes
            track.path.push({ order: _j5, lane: null, isForward: true, node: null });
            addToAssignment(_j5, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          }
          if (!currentNodeIsForward) {
            // forward to backward at current node
            track.path.push({ order: currentNode.order, lane: null, isForward: true, node: null });
            addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
            track.path.push({ order: currentNode.order, lane: null, isForward: false, node: currentNodeIndex });
            addToAssignment(currentNode.order, currentNodeIndex, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          } else {
            // current Node forward
            track.path.push({ order: currentNode.order, lane: null, isForward: true, node: currentNodeIndex });
            addToAssignment(currentNode.order, currentNodeIndex, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          }
        } else if (currentNode.order < previousNode.order) {
          if (previousNodeIsForward) {
            // turnaround from fw to bw at previous node
            track.path.push({ order: previousNode.order, lane: null, isForward: false, node: null });
            addToAssignment(previousNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          }
          for (var _j6 = previousNode.order - 1; _j6 > currentNode.order; _j6 -= 1) {
            // bachward without nodes
            track.path.push({ order: _j6, lane: null, isForward: false, node: null });
            addToAssignment(_j6, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          }
          if (currentNodeIsForward) {
            // backward to forward at current node
            track.path.push({ order: currentNode.order, lane: null, isForward: false, node: null });
            addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
            track.path.push({ order: currentNode.order, lane: null, isForward: true, node: currentNodeIndex });
            addToAssignment(currentNode.order, currentNodeIndex, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          } else {
            // backward at current node
            track.path.push({ order: currentNode.order, lane: null, isForward: false, node: currentNodeIndex });
            addToAssignment(currentNode.order, currentNodeIndex, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          }
        } else {
          // currentNode.order === previousNode.order
          if (currentNodeIsForward !== previousNodeIsForward) {
            track.path.push({ order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeIndex });
            addToAssignment(currentNode.order, currentNodeIndex, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          } else {
            track.path.push({ order: currentNode.order, lane: null, isForward: !currentNodeIsForward, node: null });
            addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
            track.path.push({ order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeIndex });
            addToAssignment(currentNode.order, currentNodeIndex, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber += 1;
          }
        }
      }
    });

    for (var _i5 = 0; _i5 <= maxOrder; _i5 += 1) {
      generateSingleLaneAssignment(assignments[_i5], _i5); // this is where the lanes get assigned
    }
  }

  function addToAssignment(order, nodeIndex, trackNo, segmentID, prevSegmentPerOrderPerTrack) {
    var compareToFromSame = prevSegmentPerOrderPerTrack[order][trackNo];

    if (nodeIndex === null) {
      assignments[order].push({ type: 'single', node: null, tracks: [{ trackID: trackNo, segmentID: segmentID, compareToFromSame: compareToFromSame }] });
      prevSegmentPerOrderPerTrack[order][trackNo] = assignments[order][assignments[order].length - 1].tracks[0];
    } else {
      for (var i = 0; i < assignments[order].length; i += 1) {
        if (assignments[order][i].node === nodeIndex) {
          // add to existing node in assignment
          assignments[order][i].type = 'multiple';
          assignments[order][i].tracks.push({ trackID: trackNo, segmentID: segmentID, compareToFromSame: compareToFromSame });
          prevSegmentPerOrderPerTrack[order][trackNo] = assignments[order][i].tracks[assignments[order][i].tracks.length - 1];
          return;
        }
      }
      // create new node in assignment
      assignments[order].push({ type: 'single', node: nodeIndex, tracks: [{ trackID: trackNo, segmentID: segmentID, compareToFromSame: compareToFromSame }] });
      prevSegmentPerOrderPerTrack[order][trackNo] = assignments[order][assignments[order].length - 1].tracks[0];
    }
  }

  // looks at assignment and sets idealY and idealLane by looking at where the tracks come from
  function getIdealLanesAndCoords(assignment, order) {
    var index = void 0;

    assignment.forEach(function (node) {
      node.idealLane = 0;
      node.tracks.forEach(function (track) {
        if (track.segmentID === 0) {
          track.idealLane = track.trackID;
          track.idealY = null;
        } else {
          if (tracks[track.trackID].path[track.segmentID - 1].order === order - 1) {
            track.idealLane = tracks[track.trackID].path[track.segmentID - 1].lane;
            track.idealY = tracks[track.trackID].path[track.segmentID - 1].y;
          } else if (track.segmentID < tracks[track.trackID].path.length - 1 && tracks[track.trackID].path[track.segmentID + 1].order === order - 1) {
            track.idealLane = tracks[track.trackID].path[track.segmentID + 1].lane;
            track.idealY = tracks[track.trackID].path[track.segmentID + 1].y;
          } else {
            index = track.segmentID - 1;
            while (index >= 0 && tracks[track.trackID].path[index].order !== order - 1) {
              index -= 1;
            }if (index < 0) {
              track.idealLane = track.trackID;
              track.idealY = null;
            } else {
              track.idealLane = tracks[track.trackID].path[index].lane;
              track.idealY = tracks[track.trackID].path[index].y;
            }
          }
        }
        node.idealLane += track.idealLane;
      });
      node.idealLane /= node.tracks.length;
    });
  }

  // assigns the optimal lanes for a single horizontal position (=order)
  // first an ideal lane is calculated for each track (which is ~ the lane of its predecessor)
  // then the nodes are sorted by their average ideal lane
  // and the whole construct is then moved up or down if necessary
  function generateSingleLaneAssignment(assignment, order) {
    var currentLane = 0;
    var potentialAdjustmentValues = new Set();
    var currentY = 20;
    var prevNameIsNull = false;
    var prevTrack = -1;

    // console.log('order : ' + order);
    // console.log(assignment);

    getIdealLanesAndCoords(assignment, order);
    if (config.firstTrackLinear) {
      assignment.slice(1, -1).sort(compareByIdealLane);
    } else {
      assignment.sort(compareByIdealLane);
    }

    assignment.forEach(function (node) {
      if (node.node !== null) {
        nodes[node.node].topLane = currentLane;
        if (prevNameIsNull) currentY -= 10;
        nodes[node.node].y = currentY;
        nodes[node.node].contentHeight = 0;
        prevNameIsNull = false;
      } else {
        if (prevNameIsNull) currentY -= 25;else if (currentY > 20) currentY -= 10;
        prevNameIsNull = true;
      }

      node.tracks.sort(compareByIdealLane);
      node.tracks.forEach(function (track) {
        track.lane = currentLane;
        if (track.trackID === prevTrack && node.node === null && prevNameIsNull) currentY += 10;
        tracks[track.trackID].path[track.segmentID].lane = currentLane;
        tracks[track.trackID].path[track.segmentID].y = currentY;
        if (track.idealY !== null) potentialAdjustmentValues.add(track.idealY - currentY);
        currentLane += 1;
        currentY += tracks[track.trackID].width;
        if (node.node !== null) {
          nodes[node.node].contentHeight += tracks[track.trackID].width;
        }
        prevTrack = track.trackID;
      });
      currentY += 25;
    });

    if (!config.firstTrackLinear) adjustVertically(assignment, potentialAdjustmentValues);
  }

  // moves all tracks at a single horizontal location (=order) up/down to minimize lane changes
  function adjustVertically(assignment, potentialAdjustmentValues) {
    var verticalAdjustment = 0;
    var minAdjustmentCost = Number.MAX_SAFE_INTEGER;

    potentialAdjustmentValues.forEach(function (moveBy) {
      if (getVerticalAdjustmentCost(assignment, moveBy) < minAdjustmentCost) {
        minAdjustmentCost = getVerticalAdjustmentCost(assignment, moveBy);
        verticalAdjustment = moveBy;
      }
    });

    assignment.forEach(function (node) {
      if (node.node !== null) {
        nodes[node.node].y += verticalAdjustment;
      }
      node.tracks.forEach(function (track) {
        tracks[track.trackID].path[track.segmentID].y += verticalAdjustment;
      });
    });
  }

  /* function adjustVertically2(assignment, adjustStart, adjustBy) {
    assignment.forEach((node) => {
      if (node.node !== null) {
        if (nodes[node.node].y >= adjustStart) {
          nodes[node.node].y += adjustBy;
        }
      }
      node.tracks.forEach((track) => {
        if (tracks[track.trackID].path[track.segmentID].y >= adjustStart) {
          tracks[track.trackID].path[track.segmentID].y += adjustBy;
        }
      });
    });
  } */

  function adjustVertically3(node, adjustBy) {
    if (node.hasOwnProperty('order')) {
      assignments[node.order].forEach(function (assignmentNode) {
        if (assignmentNode.node !== null) {
          var aNode = nodes[assignmentNode.node];
          if (aNode !== node && aNode.y > node.y) {
            aNode.y += adjustBy;
            assignmentNode.tracks.forEach(function (track) {
              tracks[track.trackID].path[track.segmentID].y += adjustBy;
            });
          }
        } else {
          // track-segment not within a node
          assignmentNode.tracks.forEach(function (track) {
            if (tracks[track.trackID].path[track.segmentID].y >= node.y) {
              tracks[track.trackID].path[track.segmentID].y += adjustBy;
            }
          });
        }
      });
      if (nodesPerOrder[node.order].length > 0) {
        nodesPerOrder[node.order].forEach(function (nodeIndex) {
          if (nodes[nodeIndex] !== node && nodes[nodeIndex].y > node.y) {
            nodes[nodeIndex].y += adjustBy;
          }
        });
      }
    }
  }

  // calculates cost of vertical adjustment as vertical distance * width of track
  function getVerticalAdjustmentCost(assignment, moveBy) {
    var result = 0;
    assignment.forEach(function (node) {
      node.tracks.forEach(function (track) {
        // if (track.idealY !== null) {
        if (track.idealY !== null && tracks[track.trackID].type !== 'read') {
          result += Math.abs(track.idealY - moveBy - tracks[track.trackID].path[track.segmentID].y) * tracks[track.trackID].width;
        }
      });
    });
    return result;
  }

  function compareByIdealLane(a, b) {
    if (a.hasOwnProperty('idealLane')) {
      if (b.hasOwnProperty('idealLane')) {
        if (a.idealLane < b.idealLane) return -1;else if (a.idealLane > b.idealLane) return 1;
        return 0;
      }
      return -1;
    }
    if (b.hasOwnProperty('idealLane')) {
      return 1;
    }
    return 0;
  }

  function compareNodesByOrder(a, b) {
    if (a === null) {
      if (b === null) return 0;
      return -1;
    }
    if (b === null) return 1;

    if (a.hasOwnProperty('order')) {
      if (b.hasOwnProperty('order')) {
        if (a.order < b.order) return -1;else if (a.order > b.order) return 1;
        if (a.hasOwnProperty('y') && b.hasOwnProperty('y')) {
          if (a.y < b.y) return -1;else if (a.y > b.y) return 1;
        }
        return 0;
      }
      return -1;
    }
    if (b.hasOwnProperty('order')) return 1;
    return 0;
  }

  function addTrackFeatures() {
    // console.log('adding track features');
    var nodeStart = void 0;
    var nodeEnd = void 0;
    var feature = {};

    // console.log('processing BED-info');
    bed.forEach(function (line) {
      var i = 0;
      while (i < numberOfTracks && tracks[i].name !== line.track) {
        i += 1;
      }if (i < numberOfTracks) {
        // console.log('Track ' + line.track + ' found');
        nodeStart = 0;
        tracks[i].path.forEach(function (node) {
          if (node.node !== null) {
            feature = {};
            // console.log(nodes[nodeMap.get(node.node)]);
            if (nodes[node.node].hasOwnProperty('sequenceLength')) {
              nodeEnd = nodeStart + nodes[node.node].sequenceLength - 1;
            } else {
              nodeEnd = nodeStart + nodes[node.node].width - 1;
            }

            // console.log(nodeStart + ', ' + nodeEnd);
            // console.log(line.start + ' ' + line.end);
            if (nodeStart >= line.start && nodeStart <= line.end) feature.start = 0;
            if (nodeStart < line.start && nodeEnd >= line.start) feature.start = line.start - nodeStart;
            if (nodeEnd <= line.end && nodeEnd >= line.start) {
              // console.log('drin');
              feature.end = nodeEnd - nodeStart;
              if (nodeEnd < line.end) feature.continue = true;
            }
            if (nodeEnd > line.end && nodeStart <= line.end) feature.end = line.end - nodeStart;
            if (feature.hasOwnProperty('start')) {
              feature.type = line.type;
              feature.name = line.name;
              if (!node.hasOwnProperty('features')) node.features = [];
              // console.log(feature);
              node.features.push(feature);
              if (i === 0 && !node.hasOwnProperty('ruler_features')) node.ruler_features = [];
              if (i === 0) node.ruler_features.push(feature);
              // console.log('adding feature');
            }
            nodeStart = nodeEnd + 1;
          }
        });
      } else {
        // console.log('Track ' + line.track + ' not found');
      }
    });
  }

  function calculateTrackWidth() {
    // flag: if vg returns freq of 0 for all tracks, we will increase width manually
    var allAreFour = true;

    tracks.forEach(function (track) {
      if (track.hasOwnProperty('freq')) {
        // custom track width
        track.width = Math.round((Math.log(track.freq) + 1) * 4);
      } else {
        // default track width
        track.width = 15;
        if (track.hasOwnProperty('type') && track.type === 'read') {
          track.width = 4;
        }
      }
      if (track.width !== 4) {
        allAreFour = false;
      }
    });

    if (allAreFour) {
      tracks.forEach(function (track) {
        if (track.hasOwnProperty('freq')) {
          track.width = 15;
        }
      });
    }
  }

  function useColorScheme(x) {
    config.colorScheme = x;
    svg = d3.select(svgID);
    // createTubeMap();
    var tr = createTubeMap();
    if (!config.hideLegendFlag) drawLegend(tr);
  }

  function assignColorSets() {
    haplotypeColors = getColorSet(config.haplotypeColors);
    forwardReadColors = getColorSet(config.forwardReadColors);
    reverseReadColors = getColorSet(config.reverseReadColors);
    exonColors = getColorSet(config.exonColors);
  }

  function getColorSet(colorSetName) {
    switch (colorSetName) {
      case 'plainColors':
        return plainColors;
      case 'reds':
        return reds;
      case 'blues':
        return blues;
      case 'greys':
        return greys;
      case 'lightColors':
        return lightColors;
      default:
        return lightColors;
    }
  }

  function generateTrackColor(track, highlight) {
    if (typeof highlight === 'undefined') highlight = 'plain';
    var trackColor = void 0;
    if (track.hasOwnProperty('type') && track.type === 'read') {
      if (track.hasOwnProperty('is_reverse') && track.is_reverse === true) {
        if (track.hasOwnProperty('reverse_read_color')) {
          trackColor = track.reverse_read_color;
        } else {
          trackColor = reverseReadColors[track.id % reverseReadColors.length];
        }
      } else {
        if (track.hasOwnProperty('forward_read_color')) {
          trackColor = track.forward_read_color;
        } else {
          trackColor = forwardReadColors[track.id % forwardReadColors.length];
        }
      }
    } else {
      /*     if (highlight === 'margin') {
             trackColor = "#fff";
           }
           else*/if (config.showExonsFlag === false || highlight !== 'plain') {
        if (track.hasOwnProperty('haplotype_color')) {
          trackColor = track.haplotype_color;
        } else {
          trackColor = haplotypeColors[track.id % haplotypeColors.length];
        }
      } else {
        if (track.hasOwnProperty('exon_color')) {
          trackColor = track.exon_color;
        } else {
          trackColor = exonColors[track.id % exonColors.length];
        }
      }
    }
    return trackColor;
  }

  function generateTrackColorOLD(track, highlight) {
    if (typeof highlight === 'undefined') highlight = 'plain';
    var trackColor = void 0;
    // Color reads in red and reverse reads in blue
    if (track.hasOwnProperty('type') && track.type === 'read') {
      // if (track.sequence[0].charAt(0) === '-') trackColor = blues[track.id % blues.length];
      if (track.hasOwnProperty('is_reverse') && track.is_reverse === true) {
        trackColor = blues[track.id % blues.length];
      } else {
        trackColor = reds[track.id % reds.length];
      }
    } else {
      if (config.colorScheme === 0) {
        // colorful color scheme
        if (config.showExonsFlag === false || highlight !== 'plain') {
          trackColor = plainColors[track.id % plainColors.length];
        } else {
          trackColor = lightColors[track.id % lightColors.length];
        }
      } else if (config.colorScheme === 1) {
        // blue-ish color scheme
        if (config.showExonsFlag === false || highlight === 'plain') {
          // trackColor = blues[track.id % blues.length];
          trackColor = greys[track.id % greys.length];
        } else {
          trackColor = reds[track.id % reds.length];
        }
      }
    }
    return trackColor;
  }

  function getReadXStart(read) {
    var node = nodes[read.path[0].node];
    if (read.path[0].isForward) {
      // read starts in forward direction
      return getXCoordinateOfBaseWithinNode(node, read.firstNodeOffset);
    }
    // read starts in backward direction
    return getXCoordinateOfBaseWithinNode(node, node.sequenceLength - read.firstNodeOffset);
  }

  function getReadXEnd(read) {
    var node = nodes[read.path[read.path.length - 1].node];
    if (read.path[read.path.length - 1].isForward) {
      // read ends in forward direction
      return getXCoordinateOfBaseWithinNode(node, read.finalNodeCoverLength);
    }
    // read ends in backward direction
    return getXCoordinateOfBaseWithinNode(node, node.sequenceLength - read.finalNodeCoverLength);
  }

  // returns the x coordinate (in pixels) of (the left side) of the given base
  // position within the given node
  function getXCoordinateOfBaseWithinNode(node, base) {
    // if (base > node.width) return null;
    if (base > node.sequenceLength) return null; // equality is allowed
    var nodeLeftX = node.x - 4;
    var nodeRightX = node.x + node.pixelWidth + 4;
    return nodeLeftX + base / node.sequenceLength * (nodeRightX - nodeLeftX);
  }

  // transforms the info in the tracks' path attribute into actual coordinates
  // and saves them in trackRectangles and trackCurves
  function generateSVGShapesFromPath() {
    var xStart = void 0;
    var xEnd = void 0;
    var yStart = void 0;
    var yEnd = void 0;
    var trackColor = void 0;
    var highlight = void 0;
    var dummy = void 0;
    var reversalFlag = void 0;

    for (var i = 0; i <= maxOrder; i += 1) {
      extraLeft.push(0);
      extraRight.push(0);
    }

    // generate x coords where each order starts and ends
    var orderStartX = [];
    var orderEndX = [];
    nodes.forEach(function (node) {
      if (node.hasOwnProperty('order')) {
        orderStartX[node.order] = node.x;
        if (orderEndX[node.order] === undefined) orderEndX[node.order] = node.x + node.pixelWidth;else orderEndX[node.order] = Math.max(orderEndX[node.order], node.x + node.pixelWidth);
      }
    });

    tracks.forEach(function (track) {
      highlight = 'plain';
      trackColor = generateTrackColor(track, highlight);

      // start of path
      yStart = track.path[0].y;
      if (track.type !== 'read' && !track.hasOwnProperty('feature')) {
        if (track.sequence[0].charAt(0) === '-') {
          // The track starts with an inversed node
          xStart = orderEndX[track.path[0].order] + 20;
        } else {
          // The track starts with a forward node
          xStart = orderStartX[track.path[0].order] - 20;
        }
      } else if (track.hasOwnProperty('feature')) {
        if (track.sequence[0].charAt(0) === '-') {
          // The track starts with an inversed node
          xStart = orderEndX[track.path[0].order] + 10;
        } else {
          // The track starts with a forward node
          xStart = orderStartX[track.path[0].order] - 10;
        }
      } else {
        xStart = getReadXStart(track);
      }

      // middle of path
      for (var _i6 = 0; _i6 < track.path.length; _i6 += 1) {
        // if  (track.path[i].y === track.path[i - 1].y) continue;
        if (track.path[_i6].y === yStart) {
          if (track.path[_i6].hasOwnProperty('features')) {
            if (_i6 > 0 && track.path[_i6 - 1].order === track.path[_i6].order) reversalFlag = true;else reversalFlag = false;
            dummy = createFeatureRectangle(track.path[_i6], orderStartX[track.path[_i6].order], orderEndX[track.path[_i6].order], highlight, track, xStart, yStart, trackColor, reversalFlag);
            highlight = dummy.highlight;
            xStart = dummy.xStart;
          }
        } else {
          if (track.path[_i6 - 1].isForward) {
            xEnd = orderEndX[track.path[_i6 - 1].order];
          } else {
            xEnd = orderStartX[track.path[_i6 - 1].order];
          }
          if (xEnd !== xStart) {
            trackColor = generateTrackColor(track, highlight);
            trackRectangles.push({ xStart: Math.min(xStart, xEnd), yStart: yStart, xEnd: Math.max(xStart, xEnd), yEnd: yStart + track.width - 1, color: trackColor, id: track.id, type: track.type });
          }

          if (track.path[_i6].order - 1 === track.path[_i6 - 1].order) {
            // regular forward connection
            xStart = xEnd;
            xEnd = orderStartX[track.path[_i6].order];
            yEnd = track.path[_i6].y;
            trackColor = generateTrackColor(track, highlight);
            trackCurves.push({ xStart: xStart, yStart: yStart, xEnd: xEnd + 1, yEnd: yEnd, width: track.width, color: trackColor, laneChange: Math.abs(track.path[_i6].lane - track.path[_i6 - 1].lane), id: track.id, type: track.type });
            xStart = xEnd;
            yStart = yEnd;
          } else if (track.path[_i6].order + 1 === track.path[_i6 - 1].order) {
            // regular backward connection
            xStart = xEnd;
            xEnd = orderEndX[track.path[_i6].order];
            yEnd = track.path[_i6].y;
            trackColor = generateTrackColor(track, highlight);
            trackCurves.push({ xStart: xStart + 1, yStart: yStart, xEnd: xEnd, yEnd: yEnd, width: track.width, color: trackColor, laneChange: Math.abs(track.path[_i6].lane - track.path[_i6 - 1].lane), id: track.id, type: track.type });
            xStart = xEnd;
            yStart = yEnd;
          } else {
            // change of direction
            if (track.path[_i6 - 1].isForward) {
              yEnd = track.path[_i6].y;
              generateForwardToReverse(xEnd, yStart, yEnd, track.width, trackColor, track.id, track.path[_i6].order, track.type);
              xStart = orderEndX[track.path[_i6].order];
              yStart = track.path[_i6].y;
            } else {
              yEnd = track.path[_i6].y;
              generateReverseToForward(xEnd, yStart, yEnd, track.width, trackColor, track.id, track.path[_i6].order, track.type);
              xStart = orderStartX[track.path[_i6].order];
              yStart = track.path[_i6].y;
            }
          }

          if (track.path[_i6].hasOwnProperty('features')) {
            if (track.path[_i6 - 1].order === track.path[_i6].order) reversalFlag = true;else reversalFlag = false;
            dummy = createFeatureRectangle(track.path[_i6], orderStartX[track.path[_i6].order], orderEndX[track.path[_i6].order], highlight, track, xStart, yStart, trackColor, reversalFlag);
            highlight = dummy.highlight;
            xStart = dummy.xStart;
          }
        }
      }

      // ending edges
      /*if (track.hasOwnProperty('feature')) {
        xEnd = orderStartX[track.path[track.path.length - 1].order] + 20
      } else*/
      if (track.type !== 'read' && !track.hasOwnProperty('feature')) {
        if (!track.path[track.path.length - 1].isForward) {
          // The track ends with an inversed node
          xEnd = orderStartX[track.path[track.path.length - 1].order] - 20;
        } else {
          // The track ends with a forward node
          xEnd = orderEndX[track.path[track.path.length - 1].order] + 20;
        }
      } else if (track.hasOwnProperty('feature')) {
        if (!track.path[track.path.length - 1].isForward) {
          // The track ends with an inversed node
          xEnd = orderStartX[track.path[track.path.length - 1].order] - 10;
        } else {
          // The track ends with a forward node
          xEnd = orderEndX[track.path[track.path.length - 1].order] + 10;
        }
      } else {
        xEnd = getReadXEnd(track);
      }
      // trackRectangles.push({xStart: xStart, yStart: yStart, xEnd: xEnd, yEnd: yStart + track.width - 1, color: trackColor, id: track.id, type: track.type});
      trackRectangles.push({ xStart: Math.min(xStart, xEnd), yStart: yStart, xEnd: Math.max(xStart, xEnd), yEnd: yStart + track.width - 1, color: trackColor, id: track.id, type: track.type });
    });
  }

  function createFeatureRectangle(node, nodeXStart, nodeXEnd, highlight, track, rectXStart, yStart, trackColor, reversalFlag) {
    var nodeWidth = void 0;
    var currentHighlight = highlight;
    var c = void 0;
    var co = void 0;
    var featureXStart = void 0;
    var featureXEnd = void 0;

    nodeXStart -= 8;
    nodeXEnd += 8;
    // console.log('creating highlight');
    if (nodes[node.node].hasOwnProperty('sequenceLength')) {
      nodeWidth = nodes[node.node].sequenceLength;
    } else {
      nodeWidth = nodes[node.node].width;
    }

    // console.log(nodeWidth);
    // console.log(nodeXStart);
    // console.log(nodeXEnd);
    node.features.sort(function (a, b) {
      return a.start - b.start;
    });
    var rectXStartTmp = rectXStart;

    node.features.forEach(function (feature) {
      // console.log(feature);
      if (currentHighlight !== feature.type) {
        // finish incoming rectangle
        c = generateTrackColor(track, currentHighlight);
        if (node.isForward === true) {
          featureXStart = nodeXStart + Math.round(feature.start * (nodeXEnd - nodeXStart + 1) / nodeWidth);

          // overwrite narrow post-inversion rectangle if highlight starts near beginning of node
          if (reversalFlag && featureXStart < nodeXStart + 8) {
            featureXEnd = nodeXStart + Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
            co = generateTrackColor(track, feature.type);
            trackRectanglesStep3.push({ xStart: featureXStart, yStart: yStart, xEnd: featureXEnd, yEnd: yStart + track.width - 1, color: co, id: track.id, type: track.type });
          }

          if (featureXStart > rectXStart + 1) {
            // console.log('drawing rect 1: ' + rectXStart + ' bis '  + (featureXStart - 1));
            trackRectanglesStep3.push({ xStart: rectXStart, yStart: yStart, xEnd: featureXStart - 1, yEnd: yStart + track.width - 1, color: c, id: track.id, type: track.type });
          }
        } else {
          // console.log('reversal 1 here:');
          featureXStart = nodeXEnd - Math.round(feature.start * (nodeXEnd - nodeXStart + 1) / nodeWidth);

          // overwrite narrow post-inversion rectangle if highlight starts near beginning of node
          if (reversalFlag && featureXStart > nodeXEnd - 8) {
            featureXEnd = nodeXEnd - Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
            co = generateTrackColor(track, feature.type);
            trackRectanglesStep3.push({ xStart: featureXEnd, yStart: yStart, xEnd: featureXStart, yEnd: yStart + track.width - 1, color: co, id: track.id, type: track.type });
          }

          if (rectXStart > featureXStart + 1) {
            // console.log('drawing rect 1 reverse: ' + rectXStart + ' bis '  + (featureXStart + 1));
            trackRectanglesStep3.push({ xStart: featureXStart + 1, yStart: yStart, xEnd: rectXStart, yEnd: yStart + track.width - 1, color: c, id: track.id, type: track.type });
          }
        }
        rectXStart = featureXStart;
        currentHighlight = feature.type;
      }
      if (feature.end < nodeWidth - 1 || !feature.hasOwnProperty('continue')) {
        // finish internal rectangle
        c = generateTrackColor(track, currentHighlight);
        if (node.isForward === true) {
          featureXEnd = nodeXStart + Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
          // console.log('drawing rect 2: ' + rectXStart + ' bis ' + (featureXEnd));
          trackRectanglesStep3.push({ xStart: rectXStart, yStart: yStart, xEnd: featureXEnd, yEnd: yStart + track.width - 1, color: c, id: track.id, type: track.type });
        } else {
          // console.log('reversal 2 here:');
          featureXEnd = nodeXEnd - Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
          // console.log('drawing rect 2 reverse: ' + rectXStart + ' bis ' + featureXEnd);
          trackRectanglesStep3.push({ xStart: featureXEnd, yStart: yStart, xEnd: rectXStart, yEnd: yStart + track.width - 1, color: c, id: track.id, type: track.type });
        }
        rectXStart = featureXEnd + 1;
        currentHighlight = 'plain';
      }
    });
    yStart = -track.width;

    if (node.ruler_features === undefined) {
      return { xStart: rectXStart, highlight: currentHighlight };
    }
    rectXStart = rectXStartTmp;
    currentHighlight = highlight;
    node.ruler_features.sort(function (a, b) {
      return a.start - b.start;
    });
    var pseudo_track = {};
    pseudo_track.haplotype_color = "#FFFFFF";
    pseudo_track.exon_color = "#AAAAAA";
    pseudo_track.id = -1;
    node.ruler_features.forEach(function (feature) {
      if (currentHighlight !== feature.type) {
        // finish incoming rectangle
        c = generateTrackColor(pseudo_track, currentHighlight);
        if (node.isForward === true) {
          featureXStart = nodeXStart + Math.round(feature.start * (nodeXEnd - nodeXStart + 1) / nodeWidth);

          // overwrite narrow post-inversion rectangle if highlight starts near beginning of node
          if (reversalFlag && featureXStart < nodeXStart + 8) {
            featureXEnd = nodeXStart + Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
            co = generateTrackColor(pseudo_track, feature.type);
            trackRectanglesStep3.push({ xStart: featureXStart, yStart: yStart, xEnd: featureXEnd, yEnd: yStart + track.width - 1, color: co, id: pseudo_track.id, type: track.type });
          }

          if (featureXStart > rectXStart + 1) {
            // console.log('drawing rect 1: ' + rectXStart + ' bis '  + (featureXStart - 1));
            trackRectanglesStep3.push({ xStart: rectXStart, yStart: yStart, xEnd: featureXStart - 1, yEnd: yStart + track.width - 1, color: c, id: pseudo_track.id, type: track.type });
          }
        } else {
          // console.log('reversal 1 here:');
          featureXStart = nodeXEnd - Math.round(feature.start * (nodeXEnd - nodeXStart + 1) / nodeWidth);

          // overwrite narrow post-inversion rectangle if highlight starts near beginning of node
          if (reversalFlag && featureXStart > nodeXEnd - 8) {
            featureXEnd = nodeXEnd - Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
            co = generateTrackColor(pseudo_track, feature.type);
            trackRectanglesStep3.push({ xStart: featureXEnd, yStart: yStart, xEnd: featureXStart, yEnd: yStart + track.width - 1, color: co, id: pseudo_track.id, type: track.type });
          }

          if (rectXStart > featureXStart + 1) {
            // console.log('drawing rect 1 reverse: ' + rectXStart + ' bis '  + (featureXStart + 1));
            trackRectanglesStep3.push({ xStart: featureXStart + 1, yStart: yStart, xEnd: rectXStart, yEnd: yStart + track.width - 1, color: c, id: pseudo_track.id, type: track.type });
          }
        }
        rectXStart = featureXStart;
        currentHighlight = feature.type;
      }
      if (feature.end < nodeWidth - 1 || !feature.hasOwnProperty('continue')) {
        // finish internal rectangle
        c = generateTrackColor(pseudo_track, currentHighlight);
        if (node.isForward === true) {
          featureXEnd = nodeXStart + Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
          // console.log('drawing rect 2: ' + rectXStart + ' bis ' + (featureXEnd));
          trackRectanglesStep3.push({ xStart: rectXStart, yStart: yStart, xEnd: featureXEnd, yEnd: yStart + track.width - 1, color: c, id: pseudo_track.id, type: track.type });
        } else {
          // console.log('reversal 2 here:');
          featureXEnd = nodeXEnd - Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
          // console.log('drawing rect 2 reverse: ' + rectXStart + ' bis ' + featureXEnd);
          trackRectanglesStep3.push({ xStart: featureXEnd, yStart: yStart, xEnd: rectXStart, yEnd: yStart + track.width - 1, color: c, id: pseudo_track.id, type: track.type });
        }
        rectXStart = featureXEnd + 1;
        currentHighlight = 'plain';
      }
    });
    return { xStart: rectXStart, highlight: currentHighlight };
  }

  function generateForwardToReverse(x, yStart, yEnd, trackWidth, trackColor, trackID, order, type) {
    x += 10 * extraRight[order];
    var yTop = Math.min(yStart, yEnd);
    var yBottom = Math.max(yStart, yEnd);
    var radius = 7;

    trackVerticalRectangles.push({ // elongate incoming rectangle a bit to the right
      xStart: x - 10 * extraRight[order],
      yStart: yStart,
      xEnd: x + 5,
      yEnd: yStart + trackWidth - 1,
      color: trackColor,
      id: trackID,
      type: type
    });
    trackVerticalRectangles.push({ // vertical rectangle
      xStart: x + 5 + radius,
      yStart: yTop + trackWidth + radius - 1,
      xEnd: x + 5 + radius + Math.min(7, trackWidth) - 1,
      yEnd: yBottom - radius + 1,
      color: trackColor,
      id: trackID,
      type: type
    });
    trackVerticalRectangles.push({
      xStart: x - 10 * extraRight[order],
      yStart: yEnd,
      xEnd: x + 5,
      yEnd: yEnd + trackWidth - 1,
      color: trackColor,
      id: trackID,
      type: type
    }); // elongate outgoing rectangle a bit to the right

    var d = 'M ' + (x + 5) + ' ' + yBottom;
    d += ' Q ' + (x + 5 + radius) + ' ' + yBottom + ' ' + (x + 5 + radius) + ' ' + (yBottom - radius);
    d += ' H ' + (x + 5 + radius + Math.min(7, trackWidth));
    d += ' Q ' + (x + 5 + radius + Math.min(7, trackWidth)) + ' ' + (yBottom + trackWidth) + ' ' + (x + 5) + ' ' + (yBottom + trackWidth);
    d += ' Z ';
    trackCorners.push({ path: d, color: trackColor, id: trackID, type: type });

    d = 'M ' + (x + 5) + ' ' + yTop;
    d += ' Q ' + (x + 5 + radius + Math.min(7, trackWidth)) + ' ' + yTop + ' ' + (x + 5 + radius + Math.min(7, trackWidth)) + ' ' + (yTop + trackWidth + radius);
    d += ' H ' + (x + 5 + radius);
    d += ' Q ' + (x + 5 + radius) + ' ' + (yTop + trackWidth) + ' ' + (x + 5) + ' ' + (yTop + trackWidth);
    d += ' Z ';
    trackCorners.push({ path: d, color: trackColor, id: trackID, type: type });
    extraRight[order] += 1;
  }

  function generateReverseToForward(x, yStart, yEnd, trackWidth, trackColor, trackID, order, type) {
    var yTop = Math.min(yStart, yEnd);
    var yBottom = Math.max(yStart, yEnd);
    var radius = 7;
    x -= 10 * extraLeft[order];

    trackVerticalRectangles.push({
      xStart: x - 6,
      yStart: yStart,
      xEnd: x + 10 * extraLeft[order],
      yEnd: yStart + trackWidth - 1,
      color: trackColor,
      id: trackID,
      type: type
    }); // elongate incoming rectangle a bit to the left
    trackVerticalRectangles.push({
      xStart: x - 5 - radius - Math.min(7, trackWidth),
      yStart: yTop + trackWidth + radius - 1,
      xEnd: x - 5 - radius - 1,
      yEnd: yBottom - radius + 1,
      color: trackColor,
      id: trackID,
      type: type
    }); // vertical rectangle
    trackVerticalRectangles.push({
      xStart: x - 6,
      yStart: yEnd,
      xEnd: x + 10 * extraLeft[order],
      yEnd: yEnd + trackWidth - 1,
      color: trackColor,
      id: trackID,
      type: type
    }); // elongate outgoing rectangle a bit to the left

    // Path for bottom 90 degree bend
    var d = 'M ' + (x - 5) + ' ' + yBottom;
    d += ' Q ' + (x - 5 - radius) + ' ' + yBottom + ' ' + (x - 5 - radius) + ' ' + (yBottom - radius);
    d += ' H ' + (x - 5 - radius - Math.min(7, trackWidth));
    d += ' Q ' + (x - 5 - radius - Math.min(7, trackWidth)) + ' ' + (yBottom + trackWidth) + ' ' + (x - 5) + ' ' + (yBottom + trackWidth);
    d += ' Z ';
    trackCorners.push({ path: d, color: trackColor, id: trackID, type: type });

    // Path for top 90 degree bend
    d = 'M ' + (x - 5) + ' ' + yTop;
    d += ' Q ' + (x - 5 - radius - Math.min(7, trackWidth)) + ' ' + yTop + ' ' + (x - 5 - radius - Math.min(7, trackWidth)) + ' ' + (yTop + trackWidth + radius);
    d += ' H ' + (x - 5 - radius);
    d += ' Q ' + (x - 5 - radius) + ' ' + (yTop + trackWidth) + ' ' + (x - 5) + ' ' + (yTop + trackWidth);
    d += ' Z ';
    trackCorners.push({ path: d, color: trackColor, id: trackID, type: type });
    extraLeft[order] += 1;
  }

  // to avoid problems with wrong overlapping of tracks, draw them in order of their color
  function drawReversalsByColor(corners, rectangles, type) {
    if (typeof type === 'undefined') type = 'haplo';
    // trackCurves = trackCurves.filter(filterObjectByAttribute('type', type));

    var co = new Set();
    rectangles.forEach(function (rect) {
      // console.log('rect: ' + rect[4]);
      // co.add(rect[4]);
      co.add(rect.color);
    });
    // console.log(co);
    co.forEach(function (c) {
      drawTrackRectangles(rectangles.filter(filterObjectByAttribute('color', c)), type);
      drawTrackCorners(corners.filter(filterObjectByAttribute('color', c)), type);
    });
  }

  // draws nodes by building svg-path for border and filling it with transparent white
  function drawNodes(dNodes, nodeCoverages, metaNodeCoverages) {
    var x = void 0;
    var y = void 0;
    var ypad = 9;
    var xpad = 9; //config.nodeWidthOption === 0 ? 9 : 0;
    // console.log(nodeCoverages);

    dNodes.forEach(function (node) {
      // top left arc
      node.d = 'M ' + (node.x - xpad) + ' ' + node.y + ' Q ' + (node.x - xpad) + ' ' + (node.y - ypad) + ' ' + node.x + ' ' + (node.y - ypad);
      x = node.x;
      y = node.y - ypad;

      // top straight
      if (node.width > 1) {
        x += node.pixelWidth;
        node.d += ' L ' + x + ' ' + y;
      }

      // top right arc
      node.d += ' Q ' + (x + xpad) + ' ' + y + ' ' + (x + xpad) + ' ' + (y + ypad);
      x += xpad;
      y += ypad;

      // right straight
      if (node.contentHeight > 0) {
        // y += (node.degree - 1) * 22;
        y += node.contentHeight - 0;
        node.d += ' L ' + x + ' ' + y;
      }

      // bottom right arc
      node.d += ' Q ' + x + ' ' + (y + ypad) + ' ' + (x - xpad) + ' ' + (y + ypad);
      x -= xpad;
      y += ypad;

      // bottom straight
      if (node.width > 1) {
        x -= node.pixelWidth;
        node.d += ' L ' + x + ' ' + y;
      }

      // bottom left arc
      node.d += ' Q ' + (x - xpad) + ' ' + y + ' ' + (x - xpad) + ' ' + (y - ypad);
      x -= xpad;
      y -= ypad;

      // left straight
      // if (node.degree > 1) {
      if (node.contentHeight > 0) {
        // y -= (node.degree - 1) * 22;
        y -= node.contentHeight - 0;
        node.d += ' L ' + x + ' ' + y;
      }

      if (nodeCoverages !== undefined) {
        // https://qiita.com/daxanya1/items/a2cd1a58cd072c3ebe67
        var dataset = nodeCoverages[node.name];
        if (dataset !== undefined) {
          dataset = dataset[0];
          //console.log(dataset);
          //console.log(x, node.x, xpad, y, ypad, node.y);
          if (node.width > 1) {
            var xscale = d3.scale.linear().domain([0, dataset.length - 1]).range([x, x + node.pixelWidth + xpad * 2]);
          } else {
            var xscale = d3.scale.linear().domain([0, dataset.length - 1]).range([x, x + xpad * 2]);
          }

          // console.log(y)
          node.coverage_d = "";
          node.coverage_stats = "";
          metaNodeCoverages.forEach(function (coverage, index) {
            var y2 = metaNodeCoverages.length > 1 ? -40 - index * 30 : 20;
            // let y2 = 20;

            var yscale = d3.scale.linear().domain([0, coverage.max]).nice().range([y2 + 20, y2]);
            //console.log(metaNodeCoverages[0]);
            // let min = coverage.min > 1 ? coverage.min : 1;
            var min = coverage.min > 2 ? 2 : 1;
            var max = coverage.max < 100 ? 100 : coverage.max;
            dataset = dataset.map(function (a) {
              return a > 1 ? a : 1;
            });
            // var yscale = d3.scale.log().domain([min, metaNodeCoverages[0].max]).range([y + 19, y]).nice();
            // console.log(min);
            yscale = d3.scale.log().domain([min, max]).range([y2 + 20, y2]);
            var d3line = d3.svg.line().x(function (d, i) {
              return xscale(i);
            }).y(function (d) {
              return yscale(d);
            }).interpolate("linear");

            // console.log(d3line(dataset));
            if (d3line(dataset) !== null) {
              //node.d += ` ${d3line(dataset)}`;
              node.coverage_d += ' ' + d3line(dataset);
              node.coverage_stats += index + ': ' + dataset[0] + '..' + dataset[dataset.length - 1] + ',';
            }
          });

          /*
                  // http://bl.ocks.org/pnavarrc/20950640812489f13246
                  var svgDefs = svg.append('defs');
          
                  var mainGradient = svgDefs.append('linearGradient')
                      .attr('id', "grad_" + node.name);
          
                  // Create the stops of the main gradient. Each stop will be assigned
                  // a class to style the stop using CSS.
                  
                  for (let i = 0; i < dataset.length; i ++) {
                    mainGradient.append('stop')
                      .attr('stop-color', d3.rgb(255 * (1.0 - dataset[i]) * 2, 255 * (1.0 - dataset[i]) * 2, 255 * (1.0 - dataset[i]) * 2))
                      .attr('offset', i / dataset.length);
                  }
          */
        }
      }
    });

    svg.selectAll('.node').data(dNodes).enter().append('path').attr('id', function (d) {
      return d.name;
    }).attr('d', function (d) {
      return d.d;
    })
    // .attr('title', function(d) { return d.name; })
    .on('mouseover', nodeMouseOver).on('mouseout', nodeMouseOut).on('dblclick', nodeDoubleClick).style('fill', config.nodeWidthOption === 0 ? '#fff' : '#fff')
    //.style('fill', x => "url(#grad_" + x.name + ")")//#config.nodeWidthOption === 0 ? '#fff': '#fff')
    //.style('fill-opacity', '0.6')
    .style('fill-opacity', config.fillNodesFlag ? '1.0' : config.showExonsFlag ? '0.4' : '0.6').style('stroke', 'black').style('stroke-width', '2px').append('svg:title').text(function (d) {
      return d.name + ": " + d.sequenceLength + "bp";
    });

    svg.selectAll('.node').data(dNodes).enter().append('path').attr('id', function (d) {
      return d.name + "_wig";
    }).attr('d', function (d) {
      return d.coverage_d;
    }).style('fill', 'none').style('stroke', 'blue').style('stroke-width', '2px').append('svg:title').text(function (d) {
      return d.coverage_stats;
    });
  }

  // draw seqence labels for nodes
  function drawLabels(dNodes) {
    if (config.nodeWidthOption === 0) {
      svg.selectAll('text')
      // svg.append('text')
      .data(dNodes).enter().append('text').attr('x', function (d) {
        return d.x - 4;
      }).attr('y', function (d) {
        return d.y + 4;
      }).text(function (d) {
        return d.seq;
      }).attr('font-family', 'Courier, "Lucida Console", monospace').attr('font-size', '14px').attr('fill', 'black').style('pointer-events', 'none');
    }
  }

  function drawYRuler() {
    metaNodeCoverages.forEach(function (coverage, index) {
      var y = metaNodeCoverages.length > 1 ? -40 - index * 30 : 20;
      // let y = 20;
      var yscale = d3.scale.linear().domain([0, coverage.max]).range([y + 20, y]).nice();
      //console.log(metaNodeCoverages[0]);
      //    let min = coverage.min > 1 ? coverage.min : 1;
      var min = coverage.min > 2 ? 2 : 1;
      var max = coverage.max < 100 ? 100 : coverage.max;
      // let dataset = dataset.map(a => a > 1 ? a : 1);
      //var yscale = d3.scale.log().domain([min, metaNodeCoverages[0].max]).range([y + 19, y]).nice();
      yscale = d3.scale.log().domain([min, max]).range([y + 20, y]);

      /*var yAxis = d3.svg.axis().scale(yscale).orient("left").ticks(2).tickSize(3).tickFormat(function (d) {
        return yscale.tickFormat(4,d3.format(",d"))(d)
      });*/
      var yAxis = d3.svg.axis().scale(yscale).orient("left").ticks(2).tickSize(3).tickFormat(function (d) {
        return yscale.tickFormat(2, d3.format(",d"))(d);
      });
      svg.append('g').attr('class', 'y axis')
      //    .attr('stroke-width', 'black')
      //    .attr('transform', 'translate(' + -2 + ',0)')
      .call(yAxis).attr('stroke-width', 1).selectAll("text").attr('font-family', 'Courier, "Lucida Console", monospace').attr('font-size', '7px').style('pointer-events', 'none');
    });
  }

  function drawXRuler() {
    if (metaNodeCoverages !== undefined) {
      metaNodeCoverages.forEach(function (coverage, index) {
        var y = metaNodeCoverages.length > 1 ? -40 - index * 30 : 20;
        // let y = 20;
        // Add baseline
        svg.append('line').attr('x1', 0).attr('y1', y).attr('x2', maxXCoordinate).attr('y2', y).attr('stroke-width', 1).attr('stroke', 'black');

        // Add top line
        svg.append('line').attr('x1', 0).attr('y1', y + 20).attr('x2', maxXCoordinate).attr('y2', y + 20).attr('stroke-width', 1).attr('stroke', 'black');

        // Add half line
        /*
        svg.append('line')
        .attr('x1', 0)
        .attr('y1', y + 10)
        .attr('x2', maxXCoordinate)
        .attr('y2', y + 10)
        .attr('stroke-width', 0.5)
        .attr('stroke', '#555');
        */
      });
    }
  }

  function drawRuler() {
    var rulerTrackIndex = 0;
    while (tracks[rulerTrackIndex].name !== trackForRuler) {
      rulerTrackIndex += 1;
    }var rulerTrack = tracks[rulerTrackIndex];
    var isNegative = function isNegative(n) {
      return ((n = +n) || 1 / n) < 0;
    };

    if (rulerTrack.indexSequence.some(function (index) {
      return isNegative(index);
    })) {
      return;
    }

    // draw horizontal line
    svg.append('line').attr('x1', 0).attr('y1', minYCoordinate - 10).attr('x2', maxXCoordinate).attr('y2', minYCoordinate - 10).attr('stroke-width', 1).attr('stroke', 'black');

    var markingInterval = 100;
    if (config.nodeWidthOption === 0) markingInterval = 20;

    var indexOfFirstBaseInNode = rulerTrack.indexOfFirstBase;
    var atLeastOneMarkingDrawn = false;
    var xCoordOfPreviousMarking = -100;

    // draw ruler marking at the left end of chart for compressed charts
    // (this marking is on purpose not at a 0 % 100 position)
    if (config.nodeWidthOption !== 0) {
      var firstNode = nodes[rulerTrack.indexSequence[0]];
      xCoordOfPreviousMarking = getXCoordinateOfBaseWithinNode(firstNode, 0);
      drawRulerMarking(indexOfFirstBaseInNode, xCoordOfPreviousMarking);
      atLeastOneMarkingDrawn = true;
    }

    rulerTrack.indexSequence.forEach(function (nodeIndex, index) {
      var currentNode = nodes[nodeIndex];
      var xCoordOfMarkingAtZero = getXCoordinateOfBaseWithinNode(currentNode, 0);
      if (rulerTrack.hasOwnProperty("coordinate") && indexOfFirstBaseInNode !== rulerTrack.coordinate[index]) {
        indexOfFirstBaseInNode = rulerTrack.coordinate[index];
        if (xCoordOfPreviousMarking + 80 < xCoordOfMarkingAtZero) {
          drawRulerMarking(indexOfFirstBaseInNode, xCoordOfMarkingAtZero);
          atLeastOneMarkingDrawn = true;
          xCoordOfPreviousMarking = xCoordOfMarkingAtZero;
        }
      }
      var nextMarking = Math.ceil(indexOfFirstBaseInNode / markingInterval) * markingInterval;
      while (nextMarking < indexOfFirstBaseInNode + currentNode.sequenceLength) {
        var xCoordOfMarking = getXCoordinateOfBaseWithinNode(currentNode, nextMarking - indexOfFirstBaseInNode);
        if (xCoordOfPreviousMarking + 80 <= xCoordOfMarking) {
          drawRulerMarking(nextMarking, xCoordOfMarking);
          atLeastOneMarkingDrawn = true;
          xCoordOfPreviousMarking = xCoordOfMarking;
        }
        nextMarking += markingInterval;
      }
      indexOfFirstBaseInNode += nodes[nodeIndex].sequenceLength;
    });

    // if no markings drawn, draw one at the very beginning
    if (!atLeastOneMarkingDrawn) {
      drawRulerMarking(rulerTrack.indexOfFirstBase, nodes[rulerTrack.indexSequence[0]].x - 4);
    }
    drawXRuler();
  }

  function drawRulerMarking(sequencePosition, xCoordinate) {
    svg.append('text').attr('x', xCoordinate).attr('y', minYCoordinate - 13).text('|' + sequencePosition).attr('font-family', 'Courier, "Lucida Console", monospace').attr('font-size', '12px').attr('fill', 'black').style('pointer-events', 'none');
  }

  function filterObjectByAttribute(attribute, value) {
    return function (item) {
      return item[attribute] === value;
    };
  }

  function drawTrackRectangles(rectangles, type) {
    if (typeof type === 'undefined') type = 'haplo';
    rectangles = rectangles.filter(filterObjectByAttribute('type', type));

    svg.selectAll('trackRectangles').data(rectangles).enter().append('rect').attr('x', function (d) {
      return d.xStart;
    }).attr('y', function (d) {
      return d.yStart;
    }).attr('width', function (d) {
      return d.xEnd - d.xStart + 1 > 0 ? d.xEnd - d.xStart + 1 : 1;
    }).attr('height', function (d) {
      return d.yEnd - d.yStart + 1;
    })
    // .style('fill', function(d) { return color(d[4]); })
    .style('fill', function (d) {
      return d.color;
    })
    // .style('fill', 'none')
    .attr('trackID', function (d) {
      return d.id;
    }).attr('class', function (d) {
      return 'track' + d.id;
    }).attr('color', function (d) {
      return d.color;
    }).on('mouseover', trackMouseOver).on('mouseout', trackMouseOut).on('dblclick', trackDoubleClick).append('svg:title').text(function (d) {
      return tracks[d.id] !== undefined ? tracks[d.id].name : "";
    });

    // drawEmptyRects(trackRectangles);
  }

  function compareCurvesByLineChanges(a, b) {
    if (a[6] < b[6]) return -1;else if (a[6] > b[6]) return 1;
    return 0;
  }

  function defineSVGPatterns() {
    var pattern = svg.append('defs').append('pattern').attr({ id: 'patternA', width: '7', height: '7', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '7', height: '7', fill: '#FFFFFF' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '3', height: '3', fill: '#505050' });
    pattern.append('rect').attr({ x: '0', y: '4', width: '3', height: '3', fill: '#505050' });
    pattern.append('rect').attr({ x: '4', y: '0', width: '3', height: '3', fill: '#505050' });
    pattern.append('rect').attr({ x: '4', y: '4', width: '3', height: '3', fill: '#505050' });

    pattern = svg.append('defs').append('pattern').attr({ id: 'patternB', width: '8', height: '8', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '8', height: '8', fill: '#FFFFFF' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '3', height: '3', fill: '#1f77b4' });
    pattern.append('rect').attr({ x: '0', y: '5', width: '3', height: '3', fill: '#1f77b4' });
    pattern.append('rect').attr({ x: '5', y: '0', width: '3', height: '3', fill: '#1f77b4' });
    pattern.append('rect').attr({ x: '5', y: '5', width: '3', height: '3', fill: '#1f77b4' });

    pattern = svg.append('defs').append('pattern').attr({ id: 'plaid0', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '2', height: '2', fill: '#1f77b4' });
    pattern.append('rect').attr({ x: '0', y: '4', width: '2', height: '2', fill: '#1f77b4' });
    pattern.append('rect').attr({ x: '4', y: '0', width: '2', height: '2', fill: '#1f77b4' });
    pattern.append('rect').attr({ x: '4', y: '4', width: '2', height: '2', fill: '#1f77b4' });

    pattern = svg.append('defs').append('pattern').attr({ id: 'plaid1', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '2', height: '2', fill: '#ff7f0e' });
    pattern.append('rect').attr({ x: '0', y: '4', width: '2', height: '2', fill: '#ff7f0e' });
    pattern.append('rect').attr({ x: '4', y: '0', width: '2', height: '2', fill: '#ff7f0e' });
    pattern.append('rect').attr({ x: '4', y: '4', width: '2', height: '2', fill: '#ff7f0e' });

    pattern = svg.append('defs').append('pattern').attr({ id: 'plaid2', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '2', height: '2', fill: '#2ca02c' });
    pattern.append('rect').attr({ x: '0', y: '4', width: '2', height: '2', fill: '#2ca02c' });
    pattern.append('rect').attr({ x: '4', y: '0', width: '2', height: '2', fill: '#2ca02c' });
    pattern.append('rect').attr({ x: '4', y: '4', width: '2', height: '2', fill: '#2ca02c' });

    pattern = svg.append('defs').append('pattern').attr({ id: 'plaid3', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '2', height: '2', fill: '#d62728' });
    pattern.append('rect').attr({ x: '0', y: '4', width: '2', height: '2', fill: '#d62728' });
    pattern.append('rect').attr({ x: '4', y: '0', width: '2', height: '2', fill: '#d62728' });
    pattern.append('rect').attr({ x: '4', y: '4', width: '2', height: '2', fill: '#d62728' });

    pattern = svg.append('defs').append('pattern').attr({ id: 'plaid4', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '2', height: '2', fill: '#9467bd' });
    pattern.append('rect').attr({ x: '0', y: '4', width: '2', height: '2', fill: '#9467bd' });
    pattern.append('rect').attr({ x: '4', y: '0', width: '2', height: '2', fill: '#9467bd' });
    pattern.append('rect').attr({ x: '4', y: '4', width: '2', height: '2', fill: '#9467bd' });

    pattern = svg.append('defs').append('pattern').attr({ id: 'plaid5', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
    pattern.append('rect').attr({ x: '0', y: '0', width: '2', height: '2', fill: '#8c564b' });
    pattern.append('rect').attr({ x: '0', y: '4', width: '2', height: '2', fill: '#8c564b' });
    pattern.append('rect').attr({ x: '4', y: '0', width: '2', height: '2', fill: '#8c564b' });
    pattern.append('rect').attr({ x: '4', y: '4', width: '2', height: '2', fill: '#8c564b' });
  }

  function drawTrackCurves(type) {
    if (typeof type === 'undefined') type = 'haplo';
    var myTrackCurves = trackCurves.filter(filterObjectByAttribute('type', type));

    myTrackCurves.sort(compareCurvesByLineChanges);

    myTrackCurves.forEach(function (curve) {
      var xMiddle = (curve.xStart + curve.xEnd) / 2;
      var d = 'M ' + curve.xStart + ' ' + curve.yStart;
      d += ' C ' + xMiddle + ' ' + curve.yStart + ' ' + xMiddle + ' ' + curve.yEnd + ' ' + curve.xEnd + ' ' + curve.yEnd;
      d += ' V ' + (curve.yEnd + curve.width);
      d += ' C ' + xMiddle + ' ' + (curve.yEnd + curve.width) + ' ' + xMiddle + ' ' + (curve.yStart + curve.width) + ' ' + curve.xStart + ' ' + (curve.yStart + curve.width);
      d += ' Z';
      // curve.push(d);
      curve.path = d;
    });

    svg.selectAll('trackCurves').data(trackCurves).enter().append('path').attr('d', function (d) {
      return d.path;
    })
    // .style('fill', d => color(d[5]); })
    .style('fill', function (d) {
      return d.color;
    }).attr('trackID', function (d) {
      return d.id;
    }).attr('class', function (d) {
      return 'track' + d.id;
    }).attr('color', function (d) {
      return d.color;
    }).on('mouseover', trackMouseOver).on('mouseout', trackMouseOut).on('dblclick', trackDoubleClick).text(function (d) {
      return tracks[d.id] !== undefined ? tracks[d.id].name : "";
    });
  }

  function drawTrackCorners(corners, type) {
    if (typeof type === 'undefined') type = 'haplo';
    corners = corners.filter(filterObjectByAttribute('type', type));

    svg.selectAll('trackCorners').data(corners).enter().append('path').attr('d', function (d) {
      return d.path;
    })
    // .style('fill', d => color(d[1]); })
    .style('fill', function (d) {
      return d.color;
    }).attr('trackID', function (d) {
      return d.id;
    }).attr('class', function (d) {
      return 'track' + d.id;
    }).attr('color', function (d) {
      return d.color;
    }).on('mouseover', trackMouseOver).on('mouseout', trackMouseOut).on('dblclick', trackDoubleClick).append('svg:title').text(function (d) {
      return tracks[d.id] !== undefined ? tracks[d.id].name : "";
    });
  }

  function drawLegend() {
    var content = '<table class="table-sm table-condensed table-nonfluid"><thead><tr><th>Color</th><th>Trackname</th><th>Show Track</th></tr></thead>';
    var listeners = [];
    for (var i = 0; i < tracks.length; i += 1) {
      if (tracks[i].type === 'haplo' && !(tracks[i].hasOwnProperty('hideLegend') && tracks[i].hideLegend == true)) {
        // content += '<tr><td><span style="color: ' + generateTrackColor(tracks[i], 'exon') + '"><i class="fa fa-square" aria-hidden="true"></i></span></td>';
        // content += `<tr><td><span style="color: ${generateTrackColor(tracks[i], 'exon')}"><span class="glyphicon glyphicon-stop" aria-hidden="true"></span></td>`;
        // content += `<tr><td><p style="color: ${generateTrackColor(tracks[i], 'exon')}">O &#x25FE;</p></td>`;
        content += '<tr><td style="text-align:right"><div class="color-box" style="background-color: ' + generateTrackColor(tracks[i], 'exon') + ';"></div></td>';
        if (tracks[i].hasOwnProperty('name')) {
          content += '<td>' + tracks[i].name + '</td>';
        } else {
          content += '<td>' + tracks[i].id + '</td>';
        }
        content += '<td><input type="checkbox" checked=true id="showTrack' + i + '"></td>';
        listeners.push(i);
      }
    }
    content += '</table';
    $('#legendDiv').html(content);
    listeners.forEach(function (i) {
      document.getElementById('showTrack' + i).addEventListener('click', function () {
        return changeTrackVisibility(i);
      }, false);
    });
  }

  // Highlight track on mouseover
  function trackMouseOver() {
    /* jshint validthis: true */
    var trackID = d3.select(this).attr('trackID');
    d3.selectAll('.track' + trackID).style('fill', 'url(#patternA)');
  }

  // Highlight node on mouseover
  function nodeMouseOver() {
    /* jshint validthis: true */
    d3.select(this).style('stroke-width', '4px');
  }

  // Restore original track appearance on mouseout
  function trackMouseOut() {
    /* jshint validthis: true */
    var trackID = d3.select(this).attr('trackID');
    d3.selectAll('.track' + trackID).each(function clearTrackHighlight() {
      var c = d3.select(this).attr('color');
      d3.select(this).style('fill', c);
    });
  }

  // Restore original node appearance on mouseout
  function nodeMouseOut() {
    /* jshint validthis: true */
    d3.select(this).style('stroke-width', '2px');
  }

  // Move clicked track to first position
  function trackDoubleClick() {
    /* jshint validthis: true */
    var trackID = d3.select(this).attr('trackID');
    var index = 0;
    // while (inputTracks[index].id !== trackID) index += 1;
    while (index < inputTracks.length && inputTracks[index].id !== Number(trackID)) {
      index += 1;
    }
    if (index >= inputTracks.length) return;
    console.log('moving index: ' + index);
    moveTrackToFirstPosition(index);
    createTubeMap();
  }

  // Redraw with current node moved to beginning
  function nodeDoubleClick() {
    /* jshint validthis: true */
    var nodeID = d3.select(this).attr('id');
    if (config.clickableNodesFlag) {
      if (reads && config.showReads) {
        document.getElementById('hgvmNodeID').value = nodeID;
        document.getElementById('hgvmPostButton').click();
      } else {
        document.getElementById('nodeID').value = nodeID;
        document.getElementById('postButton').click();
      }
    }
  }

  // extract info about nodes from vg-json
  function vgExtractNodes(vg) {
    var result = [];
    vg.node.forEach(function (node) {
      result.push({ name: '' + node.id, sequenceLength: node.sequence.length, seq: node.sequence });
      // console.log('name: ' + node.id + ', length: ' + node.sequence.length);
    });
    return result;
  }

  // calculate node widths depending on sequence lengths and chosen calculation method
  function generateNodeWidth() {
    nodes.forEach(function (node) {
      if (!node.hasOwnProperty('sequenceLength')) {
        node.sequenceLength = node.seq.length;
      }
    });

    switch (config.nodeWidthOption) {
      case 1:
        nodes.forEach(function (node) {
          node.width = 1 + Math.log(node.sequenceLength) / Math.log(2);
          node.pixelWidth = Math.round((node.width - 1) * 8.401);
        });
        break;
      case 2:
        nodes.forEach(function (node) {
          // if (node.hasOwnProperty('sequenceLength')) node.width = (1 + Math.log(node.sequenceLength) / Math.log(10));
          // node.pixelWidth = Math.round((node.width - 1) * 8.401);
          node.width = node.sequenceLength / 100;
          node.pixelWidth = Math.round((node.width - 1) * 8.401);
        });
        break;
      case 3:
        nodes.forEach(function (node) {
          node.width = node.sequenceLength / 750;
          node.pixelWidth = Math.round((node.width - 1) * 8.401);
        });
        break;
      default:
        nodes.forEach(function (node) {
          node.width = node.sequenceLength;

          // get width of node's text label by writing label, measuring it and removing label
          svg.append('text').attr('x', 0).attr('y', 100).attr('id', 'dummytext').text(node.seq.substr(1)).attr('font-family', 'Courier, "Lucida Console", monospace').attr('font-size', '14px').attr('fill', 'black').style('pointer-events', 'none');
          node.pixelWidth = Math.round(document.getElementById('dummytext').getComputedTextLength());
          $('#dummytext').remove();
        });
    }
  }

  // extract track info from vg-json
  function vgExtractTracks(vg) {
    var result = [];
    vg.path.forEach(function (path, index) {
      var sequence = [];
      var isCompletelyReverse = true;
      path.mapping.forEach(function (pos) {
        if (pos.position.hasOwnProperty('is_reverse') && pos.position.is_reverse === true) {
          sequence.push('-' + pos.position.node_id);
        } else {
          sequence.push('' + pos.position.node_id);
          isCompletelyReverse = false;
        }
      });
      if (isCompletelyReverse) {
        sequence.reverse();
        sequence.forEach(function (node, index2) {
          sequence[index2] = node.substr(1);
        });
      }
      var track = {};
      track.id = index;
      track.sequence = sequence;
      if (path.hasOwnProperty('freq')) track.freq = path.freq;
      if (path.hasOwnProperty('color')) track.color = path.color;
      if (path.hasOwnProperty('name')) track.name = path.name;
      if (path.hasOwnProperty('indexOfFirstBase')) track.indexOfFirstBase = Number(path.indexOfFirstBase);
      result.push(track);
    });
    return result;
  }

  function compareReadsByLeftEnd(a, b) {
    /* if (a.hasOwnProperty('order')) {
      if (b.hasOwnProperty('order')) {
        if (a.order < b.order) return -1;
        else if (a.order > b.order) return 1;
        else return 0;
      } else return -1;
    } else {
      if (b.hasOwnProperty('order')) return 1;
      else return 0;
    } */
    var leftNodeA = void 0;
    var leftNodeB = void 0;
    // let leftNodeAForward = true;
    // let leftNodeBForward = true;
    var leftIndexA = void 0;
    var leftIndexB = void 0;

    if (a.sequence[0].charAt(0) === '-') {
      if (a.sequence[a.sequence.length - 1].charAt(0) === '-') {
        leftNodeA = a.sequence[a.sequence.length - 1].substr(1);
        // leftNodeAForward = false;
        leftIndexA = nodes[nodeMap.get(leftNodeA)].sequenceLength - a.finalNodeCoverLength;
      } else {
        leftNodeA = a.sequence[a.sequence.length - 1];
        leftIndexA = 0;
      }
    } else {
      leftNodeA = a.sequence[0];
      leftIndexA = a.firstNodeOffset;
    }

    if (b.sequence[0].charAt(0) === '-') {
      if (b.sequence[b.sequence.length - 1].charAt(0) === '-') {
        leftNodeB = b.sequence[b.sequence.length - 1].substr(1);
        // leftNodeBForward = false;
        leftIndexB = nodes[nodeMap.get(leftNodeB)].sequenceLength - b.finalNodeCoverLength;
      } else {
        leftNodeB = b.sequence[b.sequence.length - 1];
        leftIndexB = 0;
      }
    } else {
      leftNodeB = b.sequence[0];
      leftIndexB = b.firstNodeOffset;
    }

    if (leftNodeA < leftNodeB) return -1;else if (leftNodeA > leftNodeB) return 1;
    if (leftIndexA < leftIndexB) return -1;else if (leftIndexA > leftIndexB) return 1;
    return 0;
  }

  function compareReadsByLeftEnd2(a, b) {
    // compare by order of first node
    if (nodes[a.indexSequence[0]].order < nodes[b.indexSequence[0]].order) return -1;else if (nodes[a.indexSequence[0]].order > nodes[b.indexSequence[0]].order) return 1;

    // compare by first base within first node
    if (a.firstNodeOffset < b.firstNodeOffset) return -1;else if (a.firstNodeOffset > b.firstNodeOffset) return 1;

    // compare by order of last node
    if (nodes[a.indexSequence[a.indexSequence.length - 1]].order < nodes[b.indexSequence[b.indexSequence.length - 1]].order) return -1;else if (nodes[a.indexSequence[a.indexSequence.length - 1]].order > nodes[b.indexSequence[b.indexSequence.length - 1]].order) return 1;

    // compare by last base withing last node
    if (a.finalNodeCoverLength < b.finalNodeCoverLength) return -1;else if (a.finalNodeCoverLength > b.finalNodeCoverLength) return 1;

    return 0;
  }

  function vgExtractReads(myNodes, myTracks, myReads) {
    console.log(myReads);
    var extracted = [];

    var nodeNames = [];
    myNodes.forEach(function (node) {
      nodeNames.push(parseInt(node.name, 10));
    });

    var _loop3 = function _loop3(i) {
      var read = myReads[i];
      var sequence = [];
      var sequenceNew = [];
      var firstIndex = -1; // index within mapping of the first node id contained in nodeNames
      var lastIndex = -1; // index within mapping of the last node id contained in nodeNames
      read.path.mapping.forEach(function (pos, j) {
        if (nodeNames.indexOf(pos.position.node_id) > -1) {
          var edit = {};
          var offset = 0;
          if (pos.position.hasOwnProperty('is_reverse') && pos.position.is_reverse === true) {
            sequence.push('-' + pos.position.node_id);
            // console.log(`read ${i} is reverse`);
            edit.nodeName = '-' + pos.position.node_id;
          } else {
            sequence.push('' + pos.position.node_id);
            edit.nodeName = pos.position.node_id.toString();
          }
          if (firstIndex < 0) {
            firstIndex = j;
            if (pos.position.hasOwnProperty('offset')) {
              offset = pos.position.offset;
            }
          }
          lastIndex = j;

          var mismatches = [];
          var posWithinNode = offset;
          pos.edit.forEach(function (element) {
            if (element.hasOwnProperty('to_length') && !element.hasOwnProperty('from_length')) {
              // insertion
              // console.log(`found insertion at read ${i}, node ${j} = ${pos.position.node_id}`);
              mismatches.push({ type: 'insertion', pos: posWithinNode, seq: element.sequence });
            } else if (!element.hasOwnProperty('to_length') && element.hasOwnProperty('from_length')) {
              // deletion
              // console.log(`found deletion at read ${i}, node ${j} = ${pos.position.node_id}`);
              mismatches.push({ type: 'deletion', pos: posWithinNode, length: element.from_length });
            } else if (element.hasOwnProperty('sequence')) {
              // substitution
              // console.log(`found substitution at read ${i}, node ${j} = ${pos.position.node_id}`);
              if (element.sequence.length > 1) {
                console.log('found substitution at read ' + i + ', node ' + j + ' = ' + pos.position.node_id + ', seq = ' + element.sequence);
              }
              mismatches.push({ type: 'substitution', pos: posWithinNode, seq: element.sequence });
            }
            if (element.hasOwnProperty('from_length')) {
              posWithinNode += element.from_length;
            }
          });
          edit.mismatches = mismatches;
          sequenceNew.push(edit);
        }
      });
      if (sequence.length === 0) {
        console.log('read ' + i + ' is empty');
      } else {
        var track = {};
        track.id = myTracks.length + extracted.length;
        track.sequence = sequence;
        track.sequenceNew = sequenceNew;
        track.type = 'read';
        if (read.path.hasOwnProperty('freq')) track.freq = read.path.freq;
        if (read.path.hasOwnProperty('name')) track.name = read.path.name;

        // where within node does read start
        track.firstNodeOffset = 0;
        if (read.path.mapping[firstIndex].position.hasOwnProperty('offset')) {
          track.firstNodeOffset = read.path.mapping[firstIndex].position.offset;
        }

        // where within node does read end
        var finalNodeEdit = read.path.mapping[lastIndex].edit;
        track.finalNodeCoverLength = 0;
        if (read.path.mapping[lastIndex].position.hasOwnProperty('offset')) {
          track.finalNodeCoverLength += read.path.mapping[lastIndex].position.offset;
        }
        finalNodeEdit.forEach(function (edit) {
          if (edit.hasOwnProperty('from_length')) {
            track.finalNodeCoverLength += edit.from_length;
          }
        });

        extracted.push(track);
      }
    };

    for (var i = 0; i < myReads.length; i += 1) {
      _loop3(i);
    }
    return extracted;
  }

  // remove redundant nodes
  // two nodes A and B can be merged if all tracks leaving A go directly into B
  // and all tracks entering B come directly from A
  // (plus no inversions involved)
  function mergeNodes() {
    var nodeName = void 0;
    var nodeName2 = void 0;
    var pred = []; // array of set of predecessors of each node
    var succ = []; // array of set of successors of each node
    for (var i = 0; i < nodes.length; i += 1) {
      pred.push(new Set());
      succ.push(new Set());
    }

    var tracksAndReads = void 0;
    if (reads && config.showReads) tracksAndReads = tracks.concat(reads);else tracksAndReads = tracks;

    tracksAndReads.forEach(function (track) {
      for (var _i7 = 0; _i7 < track.sequence.length; _i7 += 1) {
        if (track.sequence[_i7].charAt(0) !== '-') {
          // forward Node
          if (_i7 > 0) {
            nodeName = track.sequence[_i7 - 1];
            pred[nodeMap.get(track.sequence[_i7])].add(nodeName);
            if (nodeName.charAt(0) === '-') {
              // add 2 predecessors, to make sure there is no node merging in this case
              pred[nodeMap.get(track.sequence[_i7])].add(nodeName.substr(1));
            }
          } else if (track.type === 'haplo') {
            pred[nodeMap.get(track.sequence[_i7])].add('None');
          }
          if (_i7 < track.sequence.length - 1) {
            nodeName = track.sequence[_i7 + 1];
            succ[nodeMap.get(track.sequence[_i7])].add(nodeName);
            if (nodeName.charAt(0) === '-') {
              // add 2 successors, to make sure there is no node merging in this case
              succ[nodeMap.get(track.sequence[_i7])].add(nodeName.substr(1));
            }
          } else if (track.type === 'haplo') {
            succ[nodeMap.get(track.sequence[_i7])].add('None');
          }
        } else {
          // reverse Node
          nodeName = track.sequence[_i7].substr(1);
          if (_i7 > 0) {
            nodeName2 = track.sequence[_i7 - 1];
            if (nodeName2.charAt(0) === '-') {
              succ[nodeMap.get(nodeName)].add(nodeName2.substr(1));
            } else {
              // add 2 successors, to make sure there is no node merging in this case
              succ[nodeMap.get(nodeName)].add(nodeName2);
              succ[nodeMap.get(nodeName)].add('-' + nodeName2);
            }
            // } else {
          } else if (track.type === 'haplo') {
            succ[nodeMap.get(nodeName)].add('None');
          }
          if (_i7 < track.sequence.length - 1) {
            nodeName2 = track.sequence[_i7 + 1];
            if (nodeName2.charAt(0) === '-') {
              pred[nodeMap.get(nodeName)].add(nodeName2.substr(1));
            } else {
              pred[nodeMap.get(nodeName)].add(nodeName2);
              pred[nodeMap.get(nodeName)].add('-' + nodeName2);
            }
            // } else {
          } else if (track.type === 'haplo') {
            pred[nodeMap.get(nodeName)].add('None');
          }
        }
      }
    });

    // convert sets to arrays
    for (var _i8 = 0; _i8 < nodes.length; _i8 += 1) {
      succ[_i8] = Array.from(succ[_i8]);
      pred[_i8] = Array.from(pred[_i8]);
    }

    // update reads which pass through merging nodes
    if (reads && config.showReads) {
      // sort nodes by order, then by y-coordinate
      var sortedNodes = nodes.slice();
      sortedNodes.sort(compareNodesByOrder);

      // iterate over all nodes and calculate their position within the new merged node
      var mergeOffset = new Map();
      var mergeOrigin = new Map(); // maps to leftmost node of a node's "merging cascade"
      sortedNodes.forEach(function (node) {
        var predecessor = mergeableWithPred(nodeMap.get(node.name), pred, succ);
        if (predecessor) {
          mergeOffset.set(node.name, mergeOffset.get(predecessor) + nodes[nodeMap.get(predecessor)].sequenceLength);
          mergeOrigin.set(node.name, mergeOrigin.get(predecessor));
        } else {
          mergeOffset.set(node.name, 0);
          mergeOrigin.set(node.name, node.name);
        }
      });

      reads.forEach(function (read) {
        read.firstNodeOffset += mergeOffset.get(read.sequence[0]);
        read.finalNodeCoverLength += mergeOffset.get(read.sequence[read.sequence.length - 1]);
        for (var _i9 = read.sequence.length - 1; _i9 >= 0; _i9 -= 1) {
          if (mergeableWithPred(nodeMap.get(read.sequence[_i9]), pred, succ)) {
            (function () {
              var predecessor = mergeableWithPred(nodeMap.get(read.sequence[_i9]), pred, succ);
              if (mergeableWithSucc(nodeMap.get(predecessor), pred, succ)) {
                if (_i9 > 0) {
                  read.sequence.splice(_i9, 1);
                  // adjust position of mismatches
                  read.sequenceNew[_i9].mismatches.forEach(function (mismatch) {
                    mismatch.pos += nodes[nodeMap.get(predecessor)].sequenceLength;
                  });
                  // append mismatches to previous entry's mismatches
                  read.sequenceNew[_i9 - 1].mismatches = read.sequenceNew[_i9 - 1].mismatches.concat(read.sequenceNew[_i9].mismatches);
                  read.sequenceNew.splice(_i9, 1);
                } else {
                  read.sequence[0] = mergeOrigin.get(read.sequence[0]);
                  read.sequenceNew[_i9].mismatches.forEach(function (mismatch) {
                    mismatch.pos += mergeOffset.get(read.sequenceNew[0].nodeName);
                  });
                  read.sequenceNew[0].nodeName = mergeOrigin.get(read.sequenceNew[0].nodeName);
                }
              }
            })();
          }
        }
      });
    }

    // update node sequences + sequence lengths

    var _loop4 = function _loop4(_i10) {
      if (mergeableWithSucc(_i10, pred, succ) && !mergeableWithPred(_i10, pred, succ)) {
        (function () {
          var donor = _i10;
          while (mergeableWithSucc(donor, pred, succ)) {
            donor = succ[donor][0];
            if (donor.charAt(0) === '-') donor = donor.substr(1);
            donor = nodeMap.get(donor);

            if (nodeCoverages !== undefined && !(nodeCoverages[nodes[_i10].name] === undefined || nodeCoverages[nodes[donor].name] === undefined)) {
              metaNodeCoverages.forEach(function (_, index) {
                if (nodeCoverages[nodes[_i10].name][index] === undefined) {
                  nodeCoverages[nodes[_i10].name][index] = new Array(nodes[_i10].sequenceLength).fill(0);
                }
                if (nodeCoverages[nodes[donor].name][index] === undefined) {
                  nodeCoverages[nodes[donor].name][index] = new Array(nodes[donor].sequenceLength).fill(0);
                }
                nodeCoverages[nodes[_i10].name][index] = nodeCoverages[nodes[_i10].name][index].concat(nodeCoverages[nodes[donor].name][index]);
              });
            }

            if (nodes[_i10].hasOwnProperty('sequenceLength')) {
              nodes[_i10].sequenceLength += nodes[donor].sequenceLength;
            } else {
              nodes[_i10].width += nodes[donor].width;
            }
            nodes[_i10].seq += nodes[donor].seq;
          }
        })();
      }
    };

    for (var _i10 = 0; _i10 < nodes.length; _i10 += 1) {
      _loop4(_i10);
    }

    // actually merge the nodes by removing the corresponding nodes from track data
    tracks.forEach(function (track) {
      for (var _i11 = track.sequence.length - 1; _i11 >= 0; _i11 -= 1) {
        nodeName = track.sequence[_i11];
        if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
        var nodeIndex = nodeMap.get(nodeName);
        if (mergeableWithPred(nodeIndex, pred, succ)) {
          track.sequence.splice(_i11, 1);
          if (track.hasOwnProperty("coordinate")) {
            track.coordinate.splice(_i11, 1);
          }
        }
      }
    });

    // remove the nodes from node-array
    for (var _i12 = nodes.length - 1; _i12 >= 0; _i12 -= 1) {
      if (mergeableWithPred(_i12, pred, succ)) {
        // console.log('removing node ' + i);
        nodes.splice(_i12, 1);
      }
    }
  }

  function mergeableWithPred(index, pred, succ) {
    // if (!pred[index]) return false;
    if (pred[index].length !== 1) return false;
    if (pred[index][0] === 'None') return false;
    var predecessor = pred[index][0];
    if (predecessor.charAt(0) === '-') predecessor = predecessor.substr(1);
    var predecessorIndex = nodeMap.get(predecessor);
    if (succ[predecessorIndex].length !== 1) return false;
    if (succ[predecessorIndex][0] === 'None') return false;
    return predecessor;
  }

  function mergeableWithSucc(index, pred, succ) {
    if (succ[index].length !== 1) return false;
    if (succ[index][0] === 'None') return false;
    var successor = succ[index][0];
    if (successor.charAt(0) === '-') successor = successor.substr(1);
    var successorIndex = nodeMap.get(successor);
    if (pred[successorIndex].length !== 1) return false;
    if (pred[successorIndex][0] === 'None') return false;
    return true;
  }

  function drawMismatches() {
    tracks.forEach(function (read, trackIdx) {
      if (read.type === 'read') {
        read.sequenceNew.forEach(function (element, i) {
          element.mismatches.forEach(function (mm) {
            var nodeIndex = nodeMap.get(element.nodeName);
            var node = nodes[nodeIndex];
            var x = getXCoordinateOfBaseWithinNode(node, mm.pos);
            var pathIndex = i;
            while (read.path[pathIndex].node !== nodeIndex) {
              pathIndex += 1;
            }var y = read.path[pathIndex].y;
            if (mm.type === 'insertion') {
              if (config.showSoftClips || (mm.pos !== read.firstNodeOffset || i !== 0) && (mm.pos !== read.finalNodeCoverLength || i !== read.sequenceNew.length - 1)) {
                drawInsertion(x - 3, y + 7, mm.seq, node.y);
              }
            } else if (mm.type === 'deletion') {
              var x2 = getXCoordinateOfBaseWithinNode(node, mm.pos + mm.length);
              drawDeletion(x, x2, y + 4, node.y);
            } else if (mm.type === 'substitution') {
              var _x = getXCoordinateOfBaseWithinNode(node, mm.pos + mm.seq.length);
              drawSubstitution(x + 1, _x, y + 7, node.y, mm.seq);
            }
          });
        });
      }
    });
  }

  function drawInsertion(x, y, seq, nodeY) {
    svg.append('text').attr('x', x).attr('y', y).text('*').attr('font-family', 'Courier, "Lucida Console", monospace').attr('font-size', '12px').attr('fill', 'black').attr('nodeY', nodeY).on('mouseover', insertionMouseOver).on('mouseout', insertionMouseOut)
    // .style('pointer-events', 'none')
    .append('svg:title').text(seq);
  }

  function drawSubstitution(x1, x2, y, nodeY, seq) {
    svg.append('text').attr('x', x1).attr('y', y).text(seq).attr('font-family', 'Courier, "Lucida Console", monospace').attr('font-size', '12px').attr('fill', 'black').attr('nodeY', nodeY).attr('rightX', x2).on('mouseover', substitutionMouseOver).on('mouseout', substitutionMouseOut);
    // .style('pointer-events', 'none');
  }

  function drawDeletion(x1, x2, y, nodeY) {
    // draw horizontal block
    svg.append('line').attr('x1', x1).attr('y1', y - 1).attr('x2', x2).attr('y2', y - 1).attr('stroke-width', 7).attr('stroke', 'grey').attr('nodeY', nodeY).on('mouseover', deletionMouseOver).on('mouseout', deletionMouseOut);
  }

  function insertionMouseOver() {
    /* jshint validthis: true */
    d3.select(this).attr('fill', 'red');
    var x = Number(d3.select(this).attr('x'));
    var y = Number(d3.select(this).attr('y'));
    var yTop = Number(d3.select(this).attr('nodeY'));
    svg.append('line').attr('class', 'insertionHighlight').attr('x1', x + 4).attr('y1', y - 10).attr('x2', x + 4).attr('y2', yTop + 5).attr('stroke-width', 1).attr('stroke', 'black');
  }

  function deletionMouseOver() {
    /* jshint validthis: true */
    d3.select(this).attr('stroke', 'red');
    var x1 = Number(d3.select(this).attr('x1'));
    var x2 = Number(d3.select(this).attr('x2'));
    var y = Number(d3.select(this).attr('y1'));
    var yTop = Number(d3.select(this).attr('nodeY'));
    svg.append('line').attr('class', 'deletionHighlight').attr('x1', x1).attr('y1', y - 3).attr('x2', x1).attr('y2', yTop + 5).attr('stroke-width', 1).attr('stroke', 'black');
    svg.append('line').attr('class', 'deletionHighlight').attr('x1', x2).attr('y1', y - 3).attr('x2', x2).attr('y2', yTop + 5).attr('stroke-width', 1).attr('stroke', 'black');
  }

  function substitutionMouseOver() {
    /* jshint validthis: true */
    d3.select(this).attr('fill', 'red');
    var x1 = Number(d3.select(this).attr('x'));
    var x2 = Number(d3.select(this).attr('rightX'));
    var y = Number(d3.select(this).attr('y'));
    var yTop = Number(d3.select(this).attr('nodeY'));
    svg.append('line').attr('class', 'substitutionHighlight').attr('x1', x1 - 1).attr('y1', y - 7).attr('x2', x1 - 1).attr('y2', yTop + 5).attr('stroke-width', 1).attr('stroke', 'black');
    svg.append('line').attr('class', 'substitutionHighlight').attr('x1', x2 + 1).attr('y1', y - 7).attr('x2', x2 + 1).attr('y2', yTop + 5).attr('stroke-width', 1).attr('stroke', 'black');
  }

  function insertionMouseOut() {
    /* jshint validthis: true */
    d3.select(this).attr('fill', 'black');
    d3.selectAll('.insertionHighlight').remove();
  }

  function deletionMouseOut() {
    /* jshint validthis: true */
    d3.select(this).attr('stroke', 'grey');
    d3.selectAll('.deletionHighlight').remove();
  }

  function substitutionMouseOut() {
    /* jshint validthis: true */
    d3.select(this).attr('fill', 'black');
    d3.selectAll('.substitutionHighlight').remove();
  }

  window.vgExtractNodes = vgExtractNodes;
  window.vgExtractTracks = vgExtractTracks;
  window.vgExtractReads = vgExtractReads;
  window.setNodeWidthOption = setNodeWidthOption;
  window.setColorSet = setColorSet;
  window.create = create;
});

