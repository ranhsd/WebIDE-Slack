define(["sap/watt/common/plugin/platform/service/ui/AbstractPart","../lib/moment"], function(AbstractPart,oMoment) {
	"use strict";

	var Pane = AbstractPart.extend("slack.service.Pane", {
		_oPainView: null,
		init: function() {},

		configure: function(mConfig) {
			window.moment = oMoment;
			// include style sheet resources
			this.context.service.resource.includeStyles(mConfig.styles).done();
			
			var sLibPath = require.toUrl("slack") + "/lib/";
			sap.watt.includeScript(sLibPath + "autogrow" + "/autogrow.min.js");			
			// include style sheet resources
		},

		getContent: function() {
			if (this._oPainView === null) {
				this._oPainView = sap.ui.view({
					width: "100%",
					height: "100%",
					viewName: "slack.view.Pane",
					type: sap.ui.core.mvc.ViewType.JS,
					viewData: {
						context: this.context
					}
				});
			}
			return this._oPainView;
		},

		isEnabled: function(oDocument) {
			return true;
		},

		isAvailable: function(oDocument) {
			return true;
		}

	});

	return Pane;

});