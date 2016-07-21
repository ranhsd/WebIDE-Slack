define({

	execute: function() {
		var that = this;
		return this.context.service.rightpane.isVisible().then(function(bVisible) {
			return that.context.service.rightpane.setVisible(!bVisible);
		});
	},

	isAvailable: function() {
		return true;
	},

	isEnabled: function() {
		return true;
	}
});