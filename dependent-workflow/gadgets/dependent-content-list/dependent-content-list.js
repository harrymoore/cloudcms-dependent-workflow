define(function(require, exports, module) {

    require("css!./dependent-content-list.css");
    var html = require("text!./dependent-content-list.html");

    var Empty = require("ratchet/dynamic/empty");

    var UI = require("ui");

    return UI.registerGadget("dependent-content-list", Empty.extend({

        TEMPLATE: html,

        /**
         * Binds this gadget to the /dependent-content route
         */
        setup: function() {
            this.get("/projects/{projectId}/dependent-content", this.index);
        },

        /**
         * Puts variables into the model for rendering within our template.
         * Once we've finished setting up the model, we must fire callback().
         *
         * @param el
         * @param model
         * @param callback
         */
        prepareModel: function(el, model, callback) {

            // get the current project
            var project = this.observable("project").get();

            // the current branch
            var branch = this.observable("branch").get();

            // call into base method and then set up the model
            this.base(el, model, function() {

                // query for dependent content post instances
                branch.queryNodes({
                    "_type": "test:xxxxx", 
                },{
                    "limit": -1
                }).then(function() {

                    model.nodes = this.asArray();

                    callback();
                });
            });
        },

        /**
         * This method gets called before the rendered DOM element is injected into the page.
         *
         * @param el the dom element
         * @param model the model used to render the template
         * @param callback
         */
        /*
        beforeSwap: function(el, model, callback)
        {
            this.base(el, model, function() {
                callback();
            });
        },
        */

        /**
         * This method gets called after the rendered DOM element has been injected into the page.
         *
         * @param el the new dom element (in page)
         * @param model the model used to render the template
         * @param originalContext the dispatch context used to inject
         * @param callback
         */
        afterSwap: function(el, model, originalContext, callback)
        {
            this.base(el, model, originalContext, function() {

                // find all .media-popups and attach to a lightbox
                $(el).find(".media-popup").click(function(e) {

                    e.preventDefault();

                    var nodeIndex = $(this).attr("data-media-index");
                    var node = model.nodes[nodeIndex];

                    UI.showPopupModal({
                        "title": "Viewing: " + node.title,
                        "body": "<div style='text-align:center'><img src='" + node._doc + "'></div>"
                    });
                });

                callback();
            });
        }

    }));

});