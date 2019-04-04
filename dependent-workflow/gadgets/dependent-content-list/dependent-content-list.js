define(function (require, exports, module) {

    require("css!./dependent-content-list.css");

    var Ratchet = require("ratchet/web");
    var DocList = require("ratchet/dynamic/doclist");
    var OneTeam = require("oneteam");

    return Ratchet.GadgetRegistry.register("dependent-content-list", DocList.extend({

        configureDefault: function () {
            this.base();

            this.config({
                "observables": {
                    "query": "document-associations_query",
                    "sort": "document-associations_sort",
                    "sortDirection": "document-associations_sortDirection",
                    "searchTerm": "document-associations_searchTerm",
                    "selectedItems": "document-associations_selectedItems"
                }
            });
        },

        setup: function () {
            this.base();

            // document
            this.get("/projects/{projectId}/documents/{documentId}/dependent", this.index);
            this.get("/projects/{projectId}/content/{qname}/documents/{documentId}/dependent", this.index);
        },

        // _findIds: function (rootObj, arr = []) {
        //     var self = this;
        //     if (rootObj && rootObj._qname) console.log(rootObj._qname);

        //     Object.keys(rootObj || {}).forEach(k => {
        //         if (k === 'ref') {
        //             if (rootObj.id) {
        //                 arr.push(rootObj.id);
        //             }
        //         }
        //         if (typeof rootObj[k] === 'object') {
        //             self._findIds(rootObj[k], arr);
        //         }
        //     });
        //     return arr;
        // },

        prepareModel: function (el, model, callback) {
            var self = this;
            var document = self.observable("document").get();
            var branch = self.observable("branch").get();

            // model.relatedIds = self._findIds(JSON.parse(JSON.stringify(document)), []);

            this.base(el, model, function () {
                OneTeam.projectDefinitions(self, function (definitions) {
                    query = {
                        _type: "d:association",
                        "$or": [{
                            _qname: "a:linked"
                        },{
                            systemBootstrapped: { 
                                $exists: false 
                            }
                        }],
                        _fields: {
                            _qname: 1,
                            title: 1,
                            description: 1
                        }
                    };
        
                    Chain(branch).queryNodes(query).then(function(){
                        model.definitions = this.asArray();
                        callback();
                    });
                });

            });
        },

        doclistDefaultConfig: function () {
            var config = this.base();
            config.columns = [];

            return config;
        },

        doGitanaQuery: function (context, model, searchTerm, query, pagination, callback) {
            var self = this;
            var document = self.observable("document").get();
            var repository = self.observable("repository").get();
            var otherDocIds = [];
            var amap = {};
            var associations = null;
        
            Chain(document).associations({direction: 'OUTGOING'}, {limit: 100}).each(function() {
                var otherDocId = this.getOtherNodeId(document._doc);

                otherDocIds.push(otherDocId);
                if (!amap[otherDocId]) {
                    amap[otherDocId] = [];
                }
                amap[otherDocId].push(this.getId());
            }).then(function () {
                associations = this;

                var query = {
                    "_doc": {
                        "$in": otherDocIds
                    }
                };

                Chain(document.getBranch()).queryNodes(query, {
                    "limit": 100
                }).each(function () {
                    var associationIds = amap[this.getId()];

                    for (var i = 0; i < associationIds.length; i++) {
                        associations[associationIds[i]].node = this;
                    }
                }).then(function () {
                    Chain(repository).readBranch("master").then(function() {
                        var master = this;

                        Chain(master).queryNodes(query, {
                            "limit": 100
                        }).then(function () {
                            var masterNodes = this.asArray();
                            console.log(JSON.stringify(masterNodes, null, 4));

                            // for (var i = 0; i<masterNodes.length; i++) {
                            //     var 
                            // }

                            callback(associations);
                        });
                    });
                });
            });
        },

        // iconClass: function (row) {
        //     var self = this;

        //     var document = self.observable("document").get();
        //     var cssClass = "association-mutual-icon-64";

        //     if (row.directionality === "DIRECTED") {
        //         if (row.source === document._doc) {
        //             cssClass = "association-outgoing-icon-64";
        //         } else if (row.target === document._doc) {
        //             cssClass = "association-incoming-icon-64";
        //         }
        //     }

        //     return cssClass;
        // },

        linkUri: function (row, model, context) {
            var uri = null;

            if (row.isContainer()) {
                // folder
                uri = OneTeam.linkUri(this, row, "browse");
            } else {
                // file
                uri = OneTeam.linkUri(this, row);
            }

            return uri;
        },

        iconUri: function (row, model, context) {
            return null;
        },

        columnValue: function (row, item, model, context) {
            var self = this;

            var project = self.observable("project").get();

            var value = this.base(row, item);

            if (item.key === "document") {
                if (row.node) {
                    // var definition = model.definitions[row.node.getTypeQName()];
                    // var summary = OneTeam.buildNodeSummary(row.node, definition, project);

                    // value = OneTeam.listTitleDescription(context, row.node, self.linkUri(row.node, model, context), null, false, summary);
                    value = "";
                    value += "<h2 class='list-row-info title'>";
                    value += row.node.title;
                    value += "</h2>";
                } else {
                    value = "";
                    value += "<h2 class='list-row-info title'>";
                    value += "Unknown Document";
                    value += "</h2>";
                }
            } else if (item.key == "association") {
                var direction = null;
                if (row.directionality == "DIRECTED") {
                    //if (row.source === row._doc)
                    if (row.target === row.node._doc) {
                        direction = "Outgoing";
                    } else {
                        direction = "Incoming";
                    }
                } else {
                    direction = "Both Directions";
                }

                var summary = "";
                summary += "<p class='list-row-info summary'>";
                summary += "Type: <a href='/#/projects/" + project._doc + "/model/associations/" + row.getTypeQName() + "'>" + row.getTypeQName() + "</a>";
                summary += "<br/>";
                summary += "Direction: " + direction;
                if (row.getTypeQName() === "a:has_role") {
                    summary += "<br/>";
                    summary += "Role: " + row["role-key"];
                }
                if (typeof (row.order) !== "undefined") {
                    summary += "<br/>";
                    summary += "Order: " + row["order"];
                }

                var relatorConfig = row.getFeature("f:relator");
                if (relatorConfig) {
                    var propertyHolder = relatorConfig.propertyHolder;
                    var propertyPath = relatorConfig.propertyPath;

                    if (propertyHolder === "source") {
                        summary += "<br/>";
                        summary += "Map from Source: " + propertyPath;
                    } else if (propertyHolder === "target") {
                        summary += "<br/>";
                        summary += "Map from Target: " + propertyPath;
                    }
                }

                summary += "</p>";

                var title = row.getTypeQName();

                var definition = model.definitions[row.getTypeQName()];
                if (definition) {
                    title = definition.title;
                }

                value = OneTeam.listTitleDescription(context, row, self.linkUri(row, model, context), title, true, summary);
            } else if (item.key === "direction") {
                value = row.directionality;
            }

            return value;
        }

    }));

});