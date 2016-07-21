sap.ui.jsview("slack.view.Pane", {

	/** Specifies the Controller belonging to this View. 
	 * In the case that it is not implemented, or that "null" is returned, this View does not have a Controller.
	 * @memberOf view.Pane
	 */
	getControllerName: function() {
		return "slack.view.Pane";
	},

	/** Is initially called once after the Controller has been instantiated. It is the place where the UI is constructed. 
	 * Since the Controller is given to this method, its event handlers can be attached right away.
	 * @memberOf view.Pane
	 */
	createContent: function(oController) {
		this.oLayout = new sap.ui.commons.layout.BorderLayout({
			width: "100%",
			height: "100%",
			begin: new sap.ui.commons.layout.BorderLayoutArea({size: "0px"}),
			end: new sap.ui.commons.layout.BorderLayoutArea({size: "0px"}),
			center: this.getCenter(oController),
			top: this.getTop(oController),
			bottom: this.getBottom(oController)
		});

		return this.oLayout;
	},

	getCenter: function(oController) {
		
		this.oRowRepeater = new sap.ui.commons.RowRepeater("messages_row_repeater",{
			// noData: new sap.ui.commons.TextView({text: "No Messages..."}),
			design: sap.ui.commons.RowRepeaterDesign.BareShell,
			numberOfRows: 0,
			noData: new sap.ui.commons.TextView()
		}).addStyleClass("row-repeater");

		var oCreatedByImage = new sap.ui.commons.Image({
			width: "36px",
			height: "36px",
			src: "{image_72}"
		}).addStyleClass('user-profile-picture');

		var oCreatedByName = new sap.ui.commons.TextView({
			design: sap.ui.commons.TextViewDesign.Bold,
			text: "{createdByName}"
		}).addStyleClass('created-by-name-tv');

		var oMessage = new sap.ui.commons.TextView({
			text: "{message}",
			width: "80%"
		}).addStyleClass('message-content');

		var oCreatedAt = new sap.ui.commons.TextView({
			text: "{createdAt}"
		}).addStyleClass("created-at-tv");

		var oContentLayout = new sap.ui.layout.VerticalLayout({
			content: [oCreatedByName, oCreatedAt,oMessage]
		});

		this.oRowLayout = new sap.ui.layout.HorizontalLayout({
			width: "100%",
			content: [oCreatedByImage,oContentLayout]
		}).addStyleClass('row-layout');

		this.oRowRepeater.bindRows("/data", this.oRowLayout);

		var oLayout = new sap.ui.commons.layout.BorderLayoutArea("messages-row-layout",{
			size: "75%",
			width: "100%",
			contentAlign: "left",
			visible: true,
			content: [this.oRowRepeater]
		}).addStyleClass('bl-center-content');

		return oLayout;
	},

	getBottom: function(oController) {
		


		this.oPostTextArea = new sap.ui.commons.TextArea({
			rows: 1,
			width: "100%",
			placeholder: "Write something nice...",
			liveChange: [oController.onPostLiveChange,oController]
		}).addStyleClass('new-post-ta');
		
		var sImagePath = require.toUrl('slack') + "/img/send.png";	
		
		this.oPostButton = new sap.ui.commons.Image({
			src: sImagePath,
			width: "25px",
			height: "25px",
			visible: false,
			press: [oController.onPostButtonPressed,oController]
		});		
		
		var oAbsLayout = new sap.ui.commons.layout.AbsoluteLayout({
			width: "100%"
		}).addStyleClass('post-abs-layout');
		
		oAbsLayout.addContent(this.oPostTextArea,{left: "0px",top: "0px"});
		oAbsLayout.addContent(this.oPostButton,{right: "20px",top: "12px"});		
		
		var oLayout = new sap.ui.commons.layout.BorderLayoutArea({
			size: "10%",
			contentAlign: "center",
			visible: true,
			overflowY: 'hidden',
			overflowX: 'hidden',	
			content: [oAbsLayout]
		}).addStyleClass('bl-bottom-content');

		return oLayout;
	},

	getTop: function(oController) {
		var sImagePath = require.toUrl('slack') + "/image/slack.png";
		
		var oIcon = new sap.ui.commons.Image({
			width: "32px",
			height: "32px",
			src: "{user_image}"
		}).addStyleClass('slack-icon');
		
		var oTitleTextView = new sap.ui.commons.TextView({
			text: "Logged in as {user_fname}"	
		}).addStyleClass('slack-title-tv');
		
		
		this.oChannelsComboBox = new sap.ui.commons.ComboBox({
			width: "90%",
			change: [oController.onChannelChanged,oController]
		}).addStyleClass('slack-channels-cb');
		
		var oChannelListItem = new sap.ui.core.ListItem({
			"text" : "{name}",
			"key" : "{id}"
		});
		
		this.oChannelsComboBox.bindItems("/channels",oChannelListItem);
		
		
		var oSettingsIcon = new sap.ui.commons.Button({
			text: "Settings",
			lite: true,
			width: "auto",
			press: [oController.onSettingsButtonClicked,oController]
		}).addStyleClass('settings-button');		
		
		this.oSettingsDialog = new sap.ui.commons.Dialog({
			title: "Slack Configurations",
			content: this.getSlackConfigurationsContent(oController),
			modal: true,
			buttons : [
				new sap.ui.commons.Button({
					text : "Close",
					press: [oController.onConfigurationSaveChangesButtonClicked,oController]               
				}),				
				new sap.ui.commons.Button({
					text : "Save Changes",
					press: [oController.onConfigurationSaveChangesButtonClicked,oController]               
				})
			]
		});	
		
		var oHLayout = new sap.ui.layout.HorizontalLayout({
			width: "100%",
			content: [oIcon,oTitleTextView]	
		});
		
		
		var oVLayout = new sap.ui.layout.VerticalLayout({
			width: "100%",
			content: [oHLayout,this.oChannelsComboBox]
		}).addStyleClass('top-layout');

		var oLayout = new sap.ui.commons.layout.BorderLayoutArea({
			size: "15%",
			contentAlign: "left",
			visible: true,
			overflowY: 'hidden',
			overflowX: 'hidden',
			content: [oVLayout,oSettingsIcon]
		}).addStyleClass('bl-top-content');

		return oLayout;
	},
	
	getSlackConfigurationsContent: function(oController) {
		
		var oAuthTokenLabel = new sap.ui.commons.Label({
			text: "Authentication Token"	
		});
		
		
		this.oAuthTokenTextField = new sap.ui.commons.TextField({
			placeholder: "paste your slack authentication token here",
			required: true,
			change: [oController.onAuthTokenValueChanged,oController]
		}).addStyleClass('auth-token-text-field');
		
		var oRemoveTokenButton = new sap.ui.commons.Button({
			text : "Remove",
			lite: true,
			press: [oController.onRemoveTokenButtonClicked,oController]
		}).addStyleClass('remove-token-button');
		
		// var oTokenHLayout = new sap.ui.layout.HorizontalLayout({
		// 	width: "100%",
		// 	content: [oRemoveTokenButton,this.oAuthTokenTextField]
		// }).addStyleClass('token-h-layout');
				
		
		var oAuthGenLink = new sap.ui.commons.Link({
			text :"Generate slack authentication token",
			target: "_blank",
			href: "https://api.slack.com/web"
		}).addStyleClass('auth-token-link');
		
		var oVLayout = new sap.ui.layout.VerticalLayout({
			width: "100%",
			content: [oAuthTokenLabel,this.oAuthTokenTextField,oAuthGenLink]
		});
		
		return oVLayout;
	}
});