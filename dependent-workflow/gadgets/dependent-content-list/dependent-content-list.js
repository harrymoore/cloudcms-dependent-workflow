define(function (require, exports, module) {

    require("css!./dependent-content-list.css");

    var Ratchet = require("ratchet/web");
    var DocList = require("ratchet/dynamic/doclist");
    var OneTeam = require("oneteam");
    var bundle = Ratchet.Messages.using();

    return Ratchet.GadgetRegistry.register("dependent-content-list", DocList.extend({

        configureDefault: function () {
            this.base();

            this.config({
                "observables": {
                    "query": "document-versions_query",
                    "sort": "document-versions_sort",
                    "sortDirection": "document-versions_sortDirection",
                    "searchTerm": "document-versions_searchTerm",
                    "selectedItems": "document-versions_selectedItems"
                }
            });
        },

        setup: function () {
            this.base();

            // document
            this.get("/projects/{projectId}/documents/{documentId}/versions", this.index);
            this.get("/projects/{projectId}/content/{qname}/documents/{documentId}/versions", this.index);

            // tasks
            this.get("/tasks/{workflowTaskId}/documents/{documentId}/versions", this.index);
            this.get("/projects/{projectId}/tasks/{workflowTaskId}/documents/{documentId}/versions", this.index);

            // workflows
            this.get("/workflows/{workflowId}/documents/{documentId}/versions", this.index);
            this.get("/projects/{projectId}/workflows/{workflowId}/documents/{documentId}/versions", this.index);
        },

        entityTypes: function () {
            return {
                "plural": "versions",
                "singular": "version"
            }
        },

        getDefaultSortField: function (model) {
            return "_system.created_on.ms";
        },

        prepareModel: function (el, model, callback) {
            var self = this;

            this.base(el, model, function () {

                model.options.defaultSortDirection = -1;

                model.isOwner = self.observable("isOwner").get();
                model.isManager = self.observable("isManager").get();

                model.showChangesetLink = model.isOwner || model.isManager;

                callback();

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
            Chain(document).listVersions(pagination).each(function () {
                this.ref = null;
            }).then(function () {
                callback(this);
            });
        },

        iconClass: function (row) {
            return null;
        },

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
            return OneTeam.iconUriForNode(row);
        },

        columnValue: function (row, item, model, context) {
            var self = this;

            var project = self.observable("project").get();

            var value = this.base(row, item);

            if (item.key === "changeset") {
                var repositoryId = row.getRepositoryId();
                var changesetId = row.getSystemMetadata()["changeset"];

                value = "";

                if (model.showChangesetLink) {
                    value = "<a href='/admin/#/repositories/" + repositoryId + "/changesets/" + changesetId + "' target='_blank'>";
                }

                value += row.getSystemMetadata()["changeset"];

                if (model.showChangesetLink) {
                    value += "</a>";
                }
            }

            if (item.key === "date") {
                var date = new Date(row.getSystemMetadata().modified_on.ms);
                value = "<p class='list-row-info modified'>Modified " + bundle.relativeDate(date);
                if (row.getSystemMetadata().modified_by) {
                    var modifiedByLink = "";
                    if (row.getSystemMetadata().modified_by !== "system" && row.getSystemMetadata().modified_by !== "admin") {
                        modifiedByLink += "<a href='#/projects/" + project.getId() + "/members/" + row.getSystemMetadata().modified_by_principal_id + "'>";
                    }
                    modifiedByLink += row.getSystemMetadata().modified_by;
                    if (row.getSystemMetadata().modified_by !== "system" && row.getSystemMetadata().modified_by !== "admin") {
                        modifiedByLink += "</a>";
                    }
                    value += " by " + modifiedByLink + "</p>";
                }
            }

            if (item.key === "activity") {
                var activity = "Updated";

                var previousChangesetId = row.getSystemMetadata()["previousChangeset"];
                if (!previousChangesetId) {
                    activity = "Created";
                }

                var deleted = row.getSystemMetadata()["deleted"];
                if (deleted) {
                    activity = "Deleted";
                }

                value = activity;
            }

            return value;
        }

    }));

});