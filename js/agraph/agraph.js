/**
 * agraph.js
 * Klasa do tworzenia i edycji grafów
 *
 *
 */
(function( $ ) {

    const NODE = "NODE";
    const EDGE = "EDGE";
    const BACKGROUND = "BACKGROUND";

    var nodes = {},
        nodesSelected = {},
        edges = {};

    var fps = 0;
    var fpsLastRun;
    window.requestAnimFrame = (function(){
        return  window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame   ||
            window.mozRequestAnimationFrame      ||
            window.oRequestAnimationFrame        ||
            window.msRequestAnimationFrame       ||
            function(callback, element){
                window.setTimeout(function(){

                    callback( + new Date);
                }, 1000 / 60);
            };
    })();


    /**
     * Edge
     * @constructor
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @param startNode
     * @param endNode
     */
    function Edge( id, x1, y1, x2, y2, startNode, endNode ) {
        this.init( id, x1, y1, x2, y2, startNode, endNode );
    }
    Edge.prototype.init = function( id, x1, y1, x2, y2, startNode, endNode ) {
        this.id = id;
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;

        this.selected = 0;
    };
    Edge.prototype.showMenu = function (template) {
        var $menu = $(template);
        return $menu;
    };
    Edge.prototype.remove = function() {
        edges.splice(edges.indexOf(this), 1);
    };

    /**
     * Node
     * @constructor
     * @param x
     * @param y
     * @param r
     */
    function Node( props ) {
        this.init( props );
    }
    Node.prototype.init = function( props ) {
        this.id = props.id;
        this.x = props.x;
        this.y = props.y;
        this.r = props.r;
        this.edges = [];

        this.name = props.name ? props.name : "";
        this.weight = props.weight ? props.weight : "";
        this.selected = 0;
        this.fill = props.fill;

        this.image = props.image ? props.image : null;
    };
    Node.prototype.setXY = function (position) {
        this.x = position.x;
        this.y = position.y;
    };
    Node.prototype.showMenu = function (template) {
        var $menu = $(template);

        //Zaznacz/odznacz
        if(this.selected == 0) {
            $menu.find('.agraph-select-node-trigger').show();
            $menu.find('.agraph-unselect-node-trigger').hide();
        } else {
            $menu.find('.agraph-select-node-trigger').hide();
            $menu.find('.agraph-unselect-node-trigger').show();
        }

        //Polacz z najblizszym
        if(Object.keys(nodes).length > 1) {
            $menu.find('.agraph-add-edge-closest-trigger').show();
        } else {
            $menu.find('.agraph-add-edge-closest-trigger').hide();
        }

        //Polacz zaznaczone
        var nodesSelected = $.fn.agraph.getSelectedNodes();
        if(Object.keys(nodesSelected).length == 2) {
            $menu.find('.agraph-add-edge-selected-trigger').css('display', false);
        } else {
            $menu.find('.agraph-add-edge-selected-trigger').css('display','none');
        }

        return $menu;
    };

    /**
     * Klasa grafu
     * @param options
     * @returns {*}
     */
    $.fn.agraph = function( options ) {

        var settings = $.extend({

            workspaceBackground : "#f9f2e7",
            workspaceWidth : 1000,
            workspaceHeight : 1000,
            workspaceBorder: "0px dashed #3d3d3d",

            nodeBackground: "rgba(105, 210, 231, 1)",
            nodeColor: "#000",
            nodeBorderWidth: 20,
            nodeBorder: 'rgba(243, 134, 48, 0.75)',
            nodeBorderSelected: 'rgba(167, 219, 216, 0.5)',
            nodeRadius: 50,

            edgeBorder: "#fa6900",

            menuBackgroundTemplate: '<div class="dropdown-menu agraph-menu agraph-menu-background">' +
                                        //'<a class="dropdown-item agraph-add-node-trigger" href="#"><i class="fa fa-plus"></i> Dodaj węzeł</a>' +
                                        '<a class="dropdown-item agraph-add-node-menu-trigger" href="#"><i class="fa fa-plus"></i> Dodaj węzeł</a>' +
                                        '<div class="dropdown-divider"></div>' +
                                        '<a class="dropdown-item agraph-save-trigger" href="#"><i class="fa fa-save"></i> Zapisz</a>' +
                                    '</div>',

            popoverAddNodeTemplate:    '<div class="popover popover-bottom agraph-popover agraph-popover-add-node">' +
                                            '<div class="popover-arrow"></div>' +
                                            '<h3 class="popover-title">Dodajesz nowy węzeł</h3>' +
                                            '<div class="popover-content">' +
                                                '<form>' +
                                                    '<fieldset class="form-group">' +
                                                        '<input type="text" class="form-control" name="agraph_name" placeholder="Podaj nazwę wierzchołka">' +
                                                    '</fieldset>' +
                                                    '<fieldset class="form-group">' +
                                                        '<input type="text" class="form-control" name="agraph_weight" placeholder="Podaj wagę wierzchołka">' +
                                                    '</fieldset>' +
                                                    '<fieldset class="form-group">' +
                                                        '<input type="file" id="agraph_image" name="agraph_image"/>' +
                                                    '</fieldset>' +
                                                    '<button type="submit" class="btn btn-primary-outline btn-block agraph-add-node-trigger">Dodaj wierzchołek</button>' +
                                                '</form>' +
                                            '</div>' +
                                        '</div>',

            menuNodeTemplate:   '<div class="dropdown-menu agraph-menu agraph-menu-node">' +
                                    '<a class="dropdown-item agraph-remove-node-trigger" href="#"><i class="fa fa-trash-o"></i> Usuń</a> ' +
                                    '<a class="dropdown-item agraph-select-node-trigger" style="display: none" href="#"><i class="fa fa-check-circle"></i> Zaznacz</a>' +
                                    '<a class="dropdown-item agraph-unselect-node-trigger" style="display: none" href="#"><i class="fa fa-check-circle-o"></i> Odznacz</a>' +
                                    '<a class="dropdown-item agraph-add-image-menu-trigger" style="display: none" href="#"><i class="fa fa-file-image-o"></i> Dodaj obrazek</a>' +
                                    '<div class="dropdown-divider"></div>' +
                                    '<a class="dropdown-item agraph-add-edge-closest-trigger" href="#"><i class="fa fa-connectdevelop"></i> Połącz z najbliższym węzłem</a>' +
                                    '<a class="dropdown-item agraph-add-edge-selected-trigger" href="#"><i class="fa fa-connectdevelop"></i> Połącz wybrane węzły</a>' +
                                '</div>',

            menuEdgeTemplate:   '<div class="dropdown-menu agraph-menu agraph-menu-edge">' +
                                    '<a class="dropdown-item agraph-remove-edge-trigger" href="#"><i class="fa fa-trash-o"></i> Usuń krawędź</a> ' +
                                '</div>',

        }, options );

        /**
         * Stwórz CANVASA
         */
        this.css({
            width: settings.workspaceWidth,
            height: settings.workspaceHeight
        }).append('' +
            '<canvas ' +
            'width="' + settings.workspaceWidth + 'px" ' +
            'height="' + settings.workspaceHeight + 'px" ' +
            'style="background: ' + settings.workspaceBackground + '; border: ' + settings.workspaceBorder + '">' +
                'Sorry, your browser do not support Canvas! Please try Google Chrome.' +
            '</canvas>');


        var $this = this.find('canvas'),
            $canvas = $this[0],
            $context = $this[0].getContext('2d');



        /**
         * Eventy dla CANVASa
         */
        var mouseIsClickedDown = false,
            mouseIsClickedDownPP = false,
            mouseClickedDownPosition = {x : 0, y : 0},
            mouseClickedDownPositionPP = {x : 0, y : 0},
            mouseClickedWhat = null,
            mouseClickedWhatObj = {};
            mouseClickedWhatPP = null,
            mouseCurrentPosition = {x : 0, y : 0},

            workspaceOffset = {x : $this.offset().left, y : $this.offset().top},

            fileReader = null,
            fileReaderImage = null

            ;

        function setXYPosition(e) {
            return {
                x : e.pageX - workspaceOffset.x,
                y : e.pageY - workspaceOffset.y
            };
        }

        function mouseIsClikedDownNode(e) {
            var position = setXYPosition(e),
                node = getNode(position.x, position.y);
            return node;
        }

        function mouseIsClickedDownEdge(e) {
            var position = setXYPosition(e),
                edge = getEdge(position.x, position.y);
            return edge;
        }

        /**
         * Obsługa lewokliku na CANVASie
         * @param e
         */
        function mouseClickDown(e){
            e.preventDefault();

            mouseIsClickedDown = true;
            mouseClickedDownPosition = setXYPosition(e);

            closeMenus();

            if(e.button === 0) {
                var node = mouseIsClikedDownNode(e),
                    edge = mouseIsClickedDownEdge(e)
                    ;
                if(node !== null) {
                    mouseClickedWhat = NODE;
                    mouseClickedWhatObj = node;
                    //Zaznacz
                    if (e.ctrlKey) {
                        mouseClickedWhatObj.selected = (mouseClickedWhatObj.selected == 1) ? 0 : 1;
                        var nodeSelected = getNodeById(mouseClickedWhatObj.id, nodesSelected);
                        if(nodeSelected !=  null) {
                            delete nodesSelected[nodeSelected.id];
                        } else {
                            if(Object.keys(nodesSelected).length > 1) {
                                nodes[Object.keys(nodesSelected)[0]].selected = 0;
                                delete nodesSelected[Object.keys(nodesSelected)[0]];
                            }
                            nodesSelected[mouseClickedWhatObj.id] = mouseClickedWhatObj;
                        }
                    }
                } else if(edge !== null) {
                    mouseClickedWhat = EDGE;
                    mouseClickedWhatObj = edge;
                } else {
                    mouseClickedWhat = BACKGROUND;
                    mouseClickedWhatObj = null;
                }
            }
        }

        /**
         * Obsługa prawokliku na CANVASie
         * @param e
         */
        function mouseClickDownContextMenu(e) {
            e.preventDefault();

            mouseIsClickedDownPP = true;
            mouseClickedDownPositionPP = setXYPosition(e);

            closePopovers();

            var $menu = null,
                node = mouseIsClikedDownNode(e),
                edge = mouseIsClickedDownEdge(e);

            if(node !== null) {
                mouseClickedWhatPP = NODE;
                mouseClickedWhatObjPP = node;
                $menu = node.showMenu(settings.menuNodeTemplate);
            } else if(edge !== null) {
                mouseClickedWhatPP = EDGE;
                mouseClickedWhatObjPP = edge;
                $menu = edge.showMenu(settings.menuEdgeTemplate);
            } else {
                mouseClickedWhatPP = BACKGROUND;
                mouseClickedWhatObjPP = null;
                $menu = $(settings.menuBackgroundTemplate);
            }

            if($menu !== null) {
                $('body').append($menu);
                $menu.finish().show(200).css({top:  e.pageY + "px", left: e.pageX + "px"});
            }
        }

        /**
         * Ruch myszą
         * @param e
         */
        function mouseMove(e) {

            mouseCurrentPosition = setXYPosition(e);
            if(mouseIsClickedDown) {
                if(mouseCurrentPosition.x != mouseClickedDownPosition.x || mouseCurrentPosition.y != mouseClickedDownPosition.y) {
                    /**
                     * Przenoszenie NODEa
                     */
                    if(mouseClickedWhat == NODE) {
                        mouseClickedWhatObj.setXY(mouseCurrentPosition);
                        $.each(mouseClickedWhatObj.edges, function(i, e) {
                            if(typeof e !== "undefined") {
                                var d1 = getPointsDistance({
                                    x: mouseClickedWhatObj.x,
                                    y: mouseClickedWhatObj.y
                                }, {x: e.x1, y: e.y1});
                                var d2 = getPointsDistance({
                                    x: mouseClickedWhatObj.x,
                                    y: mouseClickedWhatObj.y
                                }, {x: e.x2, y: e.y2});
                                if (d1 < d2) {
                                    e.x1 = mouseCurrentPosition.x;
                                    e.y1 = mouseCurrentPosition.y;
                                } else {
                                    e.x2 = mouseCurrentPosition.x;
                                    e.y2 = mouseCurrentPosition.y;
                                }
                            }
                        });
                    }
                }
            }

        }

        function mouseClickUp(){
            mouseIsClickedDown = false;
            mouseIsClickedDownPP = false;
            mouseClickedDownPosition = {x : 0, y : 0};
            mouseClickedDownPositionPP = {x : 0, y : 0};
            closePopovers();
        }

        function closeMenus() {
            $(".agraph-menu").remove();
        }

        function closePopovers() {
            $(".agraph-popover").remove();
        }

        function drawBoard(context, bw, bh){
            var p = 10;

            for (var x = 0; x <= bw; x += 40) {
                context.moveTo(0.5 + x + p, p);
                context.lineTo(0.5 + x + p, bh + p);
            }


            for (var x = 0; x <= bh; x += 40) {
                context.moveTo(p, 0.5 + x + p);
                context.lineTo(bw + p, 0.5 + x + p);
            }

            context.strokeStyle = "white";
            context.stroke();
        }

        $canvas.addEventListener("mousedown", mouseClickDown);
        $canvas.addEventListener("contextmenu", mouseClickDownContextMenu);
        $canvas.addEventListener("mouseup", mouseClickUp);
        $canvas.addEventListener("mousemove", mouseMove);

        /**
         * Eventy dla menu
         */
        $(document).on('click', '.agraph-add-node-menu-trigger', function(e) {
            e.preventDefault();
            closeMenus();
            closePopovers();

            var $menu = $(settings.popoverAddNodeTemplate);
            $('body').append($menu);
            $menu.finish().show(200).css({top:  e.pageY + "px", left: (e.pageX - $menu.width() / 2) + "px"});

        });

        $(document).on('change', 'input[name=agraph_image]', function(e) {
            var input = $(this)[0];
            if (input.files && input.files[0]) {
                fileReader = new FileReader();
                fileReaderImage = new Image();
                fileReader.onload = function (e) {
                    fileReaderImage.src = fileReader.result;
                };
                fileReaderImage.src = fileReader.readAsDataURL(input.files[0]);
            }
        });

        $(document).on('click', '.agraph-add-node-trigger', function(e) {
            e.preventDefault();
            var uniqid = $.fn.agraph.uniqid(),
                name = $(this).closest('form').find('input[name=agraph_name]').val(),
                weight = $(this).closest('form').find('input[name=agraph_weight]').val(),
                node = new Node({
                    id : uniqid,
                    name : name,
                    weight : weight,
                    x : mouseClickedDownPositionPP.x,
                    y : mouseClickedDownPositionPP.y,
                    r : settings.nodeRadius,
                    fill : settings.nodeBackground,
                    image : null
                });

            if(fileReader != null && fileReaderImage != null) {
                node.image = fileReaderImage;
                fileReader = null;
                fileReaderImage = null;
            }

            nodes[uniqid] = node;
            closePopovers();
        });

        $(document).on('click', '.agraph-remove-node-trigger', function(e) {
            e.preventDefault();
            var node = getNode(mouseClickedDownPositionPP.x, mouseClickedDownPositionPP.y);
            $.each(node.edges, function(i, e) {
                delete edges[e.id]
            });
            delete nodes[node.id];
            closeMenus();
        });

        $(document).on('click', '.agraph-remove-edge-trigger', function(e) {
            e.preventDefault();
            var edge = getEdge(mouseClickedDownPositionPP.x, mouseClickedDownPositionPP.y);
            $.each(nodes, function(i, node) {
                $.each(node.edges, function(i, e) {
                    if(e.id == edge.id) {
                        delete node.edges[i];
                    }
                });
            });
            delete edges[edge.id];
            closeMenus();
        });

        $(document).on('click', '.agraph-add-edge-closest-trigger', function(e) {
            e.preventDefault();
            var thisNode = getNode(mouseClickedDownPositionPP.x, mouseClickedDownPositionPP.y);
            var closestNode = getClosestNode(thisNode);
            var uniqid = $.fn.agraph.uniqid();
            var edge = new Edge(uniqid, thisNode.x, thisNode.y, closestNode.x, closestNode.y, thisNode, closestNode);
            edges[uniqid] = edge;
            thisNode.edges.push(edge);
            closestNode.edges.push(edge);
            closeMenus();
        });

        $(document).on('click', '.agraph-select-node-trigger', function(e) {
            e.preventDefault();
            var thisNode = getNode(mouseClickedDownPositionPP.x, mouseClickedDownPositionPP.y);
            thisNode.selected = 1;
            closeMenus();
        });

        $(document).on('click', '.agraph-unselect-node-trigger', function(e) {
            e.preventDefault();
            var thisNode = getNode(mouseClickedDownPositionPP.x, mouseClickedDownPositionPP.y);
            thisNode.selected = 0;
            closeMenus();
        });

        $(document).on('click', '.agraph-add-edge-selected-trigger', function(e) {
            e.preventDefault();
            var selectedNodes = [];
            $.each(nodesSelected, function(i, node) {
                selectedNodes.push(node);
                node.selected = 0;
            });
            var uniqid = $.fn.agraph.uniqid(),
                edge = new Edge(uniqid, selectedNodes[0].x, selectedNodes[0].y, selectedNodes[1].x, selectedNodes[1].y, selectedNodes[0], selectedNodes[1]);
            edges[uniqid] = edge;
            selectedNodes[0].edges.push(edge);
            selectedNodes[1].edges.push(edge);
            nodesSelected = {};

            closeMenus();
        });

        $(document).on('click', '.agraph-save-trigger', function(e) {
            e.preventDefault();
            $.cookie('agraph', JSON.stringify([nodes, edges]), { expires: 7 });
        });


        /**
         * Rysuje context
         */
        function render(){

            if(!fpsLastRun) {
                fpsLastRun = new Date().getTime();
                requestAnimFrame(render);
                return;
            }
            var delta = (new Date().getTime() - fpsLastRun)/1000;
            fpsLastRun = new Date().getTime();
            fps = 1/delta;


            $context.beginPath();
            $context.clearRect(0, 0, $canvas.width, $canvas.height);
            $context.fillStyle = "Black";
            $context.textAlign = "left";
            $context.font = "normal 6pt Arial";
            $context.fillText(fps + " fps", 20, 20);
            $context.closePath();

            $context.beginPath();
            $context.lineWidth = 1;
            drawBoard($context, $canvas.width, $canvas.height);
            $context.closePath();

            if(!jQuery.isEmptyObject(edges)) {
                $.each(edges, function (i, edge) {
                    $context.beginPath();
                    $context.moveTo(edge.x1, edge.y1);
                    $context.lineTo(edge.x2, edge.y2);
                    $context.lineWidth = 1;
                    $context.strokeStyle = settings.edgeBorder;
                    $context.stroke();
                });
            }
            if(!jQuery.isEmptyObject(nodes)) {
                $.each(nodes, function (i, node) {

                    //Zdjecie
                    if(node.image != null) {
                        $context.save();
                        $context.beginPath();
                        $context.arc(node.x - 50, node.y - 50, 100, 0, 2 * Math.PI, true);
                        $context.closePath();
                        $context.clip();
                        $context.drawImage(node.image, node.x - 150, node.y - 150, 200, 200);
                        $context.beginPath();
                        $context.arc(node.x - 50, node.y - 50, 100, 0, Math.PI * 2, true);
                        $context.clip();
                        $context.closePath();
                        $context.restore();
                    }

                    //Napis
                    $context.beginPath();
                    if (node.name != "") {
                        $context.fillStyle = settings.nodeColor;
                        $context.font = "12px Arial";
                        $context.textAlign = "left";
                        $context.fillText(node.name, node.x + node.r + 5, node.y - node.r - 5);

                        $context.lineWidth = 1;
                        $context.strokeStyle = 'rgba(0, 0, 0, 1)';
                        $context.moveTo(node.x, node.y);
                        $context.lineTo(node.x + node.r - 2, node.y - node.r + 2);
                        $context.lineTo(node.x + node.r - 2 + $context.measureText(node.name).width + 15, node.y - node.r + 2);
                        $context.stroke();
                    }
                    $context.closePath();

                    //Node
                    $context.beginPath();
                    $context.fillStyle = node.fill;
                    $context.arc(node.x, node.y, node.r, 0, 2 * Math.PI, false);
                    $context.fill();
                    if (node.selected == 1) {
                        $context.strokeStyle = settings.nodeBorder;
                    } else {
                        $context.strokeStyle = settings.nodeBorderSelected;
                    }
                    $context.lineWidth = settings.nodeBorderWidth;
                    $context.stroke();

                    $context.closePath();

                    //Waga
                    $context.beginPath();
                    if (node.weight != "") {
                        $context.fillStyle = settings.nodeColor;
                        $context.font = "bold 26px Arial";
                        $context.textAlign = "center";
                        $context.fillText(node.weight, node.x, node.y + 10);
                    }
                    $context.lineWidth = settings.nodeBorderWidth;
                    $context.stroke();
                    $context.closePath();

                    //Srodek
                    $context.beginPath();
                    $context.lineWidth = 3;
                    $context.moveTo(node.x, node.y);
                    $context.lineTo(node.x + 1, node.y + 1);
                    $context.stroke();
                    $context.closePath();

                });
            }
            requestAnimFrame(render);
        }
        render();

        /**
         * Pobiera node z kolekcji wg wskazanego id
         * @param id
         * @param collection
         */
        var getNodeById = function(id, collection) {

            var result = null;
            $.each(collection, function(i, o) {
                if(o.id == id) {
                    result = 0;
                    return false;
                }
            });
            return result;
        };

        /**
         * Ustawia pozycja X,Y
         * @param n1
         * @param n2
         */
        var getPointsDistance = function(n1, n2) {
            return Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
        };

        var getPointToLineDistance = function(n1, n2) {
            return Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
        };

        /**
         * Wybiera najbliższy node do wskazanego
         * @param n
         * @returns {{}}
         */
        var getClosestNode = function(n) {
            var distance = 2000,
                d = distance,
                result = {};
            $.each(nodes, function(i, node) {
                if(n.id == node.id) {
                    return;
                }
                d = getPointsDistance(n, node);
                console.log(d, distance);
                if(d < distance) {
                    result = node;
                    distance = d;
                }
            });
            return result;
        };

        /**
         * Wybiera najbliższy node do wskazanego
         * @param n
         * @returns {{}}
         */
        $.fn.agraph.getSelectedNodes = function() {
            var nodesSelected = {};
            $.each(nodes, function(i, node) {
                if(node.selected == 1) {
                    nodesSelected[i] = node;
                }
            });
            return nodesSelected;
        };

        /**
         * Zwraca node na podstawie podanych współprzędnych
         * Np. node na którym kliknięto
         * @param x
         * @param y
         */
        var getNode = function(x, y) {
            var result = null;
            $.each(nodes, function(i, n) {
                var distanceToNodeCenter = getPointsDistance(n, {
                    x : x,
                    y : y
                });
                if(distanceToNodeCenter <= n.r) {
                    result = n;
                    return false;
                }
            });
            return result;
        };


        /**
         * Zwraca krawędź w pobliżu na podstawie podanych x, y
         */
        function isOnLine(x, y, endx, endy, px, py) {
            var f = function(somex) { return (endy - y) / (endx - x) * (somex - x) + y; };
            return Math.abs(f(px) - py) < 10 // tolerance, rounding errors
                && px >= x && px <= endx;      // are they also on this segment?
        }

        var getEdge = function(x, y) {
            var result = null;
            $.each(edges, function(i, e) {
                console.log('check ', {x : e.x1, y : e.y1}, {x : e.x2, y : e.y2}, {x : x, y : y});
                if(isOnLine(e.x1, e.y1, e.x2, e.y2, x, y)) {
                //if(isOnLine({x : e.x1, y : e.y1}, {x : e.x2, y : e.y2}, {x : x, y : y}, 20)) {
                    result = e;
                    console.log('ok');
                    return false;
                }
            });
            return result;
        };

        //Dla chaina
        return this;
    };

    $.fn.agraph.uniqid = function(prefix, more_entropy) {
        //  discuss at: http://phpjs.org/functions/uniqid/
        // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        //  revised by: Kankrelune (http://www.webfaktory.info/)
        //        note: Uses an internal counter (in php_js global) to avoid collision
        //        test: skip
        //   example 1: uniqid();
        //   returns 1: 'a30285b160c14'
        //   example 2: uniqid('foo');
        //   returns 2: 'fooa30285b1cd361'
        //   example 3: uniqid('bar', true);
        //   returns 3: 'bara20285b23dfd1.31879087'

        if (typeof prefix === 'undefined') {
            prefix = '';
        }

        var retId;
        var formatSeed = function(seed, reqWidth) {
            seed = parseInt(seed, 10)
                .toString(16); // to hex str
            if (reqWidth < seed.length) { // so long we split
                return seed.slice(seed.length - reqWidth);
            }
            if (reqWidth > seed.length) { // so short we pad
                return Array(1 + (reqWidth - seed.length))
                        .join('0') + seed;
            }
            return seed;
        };

        // BEGIN REDUNDANT
        if (!this.php_js) {
            this.php_js = {};
        }
        // END REDUNDANT
        if (!this.php_js.uniqidSeed) { // init seed with big random int
            this.php_js.uniqidSeed = Math.floor(Math.random() * 0x75bcd15);
        }
        this.php_js.uniqidSeed++;

        retId = prefix; // start with prefix, add current milliseconds hex string
        retId += formatSeed(parseInt(new Date()
                .getTime() / 1000, 10), 8);
        retId += formatSeed(this.php_js.uniqidSeed, 5); // add seed hex string
        if (more_entropy) {
            // for more entropy we add a float lower to 10
            retId += (Math.random() * 10)
                .toFixed(8)
                .toString();
        }

        return retId;
    }

    $.fn.agraph.version = "0.0.1";





}( jQuery ));

