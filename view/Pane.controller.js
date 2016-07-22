jQuery.sap.require("jquery.sap.storage");
sap.ui.controller("slack.view.Pane", {
	_oSocket: null,
	_vToken: null,
	_vChannel: null,
	_bConnected: false,
	_bAutoGrowthSet: false,
	_oStorage: null,
	_oUserInfo: null,
	/** 
	 * Called when a controller is instantiated and its View controls (if available) are already created. 
	 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization. 
	 * @memberOf view.Pane 
	 */
	onInit: function() {
		/** get the slack authentication token from local storag 
		 *  Notice! this is not a best practice to store tokens in the local storage 
		 *  we are doing it for testing only scenarios 
		 * */
		this._oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
		this._vToken = this._oStorage.get("slackAuthenticationToken");
		// Create the data model skeleton  
		var oModel = new sap.ui.model.json.JSONModel({
			user: {},
			data: [],
			channels: [],
			users: []
		});
		sap.ui.getCore().setModel(oModel); // Set model skeleton to the global model  
		/** 
		 * If the user not enter his/her token yet display no data message 
		 * */
		if (!this._vToken) {
			this.displayNoData();
		} else {
			var that = this;
			// set the token into the dialog input field  
			this.getView().oAuthTokenTextField.setValue(this._vToken);
			// test if the token is valid with slack.com api  
			this.testAuthenticationToken(this._vToken, function(authResponse) {
				// if the token is valid, fetch logged in user details from api  
				if (authResponse.ok === true) {
					var oUser = {
						user_id: authResponse.user_id,
						team_id: authResponse.team_id,
						username: authResponse.user,
						url: authResponse.url,
						profile: {}
					};
					// execute request to get user info  
					that.getUserInfo(authResponse.user_id, function(userInfoResponse) {
						if (userInfoResponse.ok === true) {
							// bind user info to data model  
							oModel.oData.user.profile = userInfoResponse.user.profile;
							oModel.oData.user_image = userInfoResponse.user.profile.image_72;
							oModel.oData.user_fname = userInfoResponse.user.real_name;
							oModel.oData.user = oUser;
							that.getView().bindElement("/");
							// connect to slack.com socket API's and fetch chat history  
							that.connectAndLoadData();
						}
					});
				} else {
					// if the token is invalid, present no data  
					that.displayNoData();
				}
			});
		}
	},
	displayNoData: function() {
		this.getView().oRowRepeater.setNoData(new sap.ui.commons.Button({
			width: "100%",
			lite: true,
			text: "Get started here",
			press: [this.onSettingsButtonClicked, this]
		}).addStyleClass('get-started-button'));
	},
	connectAndLoadData: function() {
		this.getView().oRowRepeater.setBusy(true); // display activity indicator while loading data --> it's better to do it with model binding..  
		this.connentToSlack(); // connect to slack WebSocket API  
	},
	onAfterRendering: function() {},
	/** 
	 * 
	 * */
	connentToSlack: function() {
		var that = this;
		// execute reques to rtm (real time messaging) WebSocket api  
		$.get("https://slack.com/api/rtm.start", {
			token: this._vToken
		}, function(data) {
			// create the WebSocket native object  
			that._oSocket = new WebSocket(data.url);
			that._oSocket.onopen = function() {
				// implement on connetion opened here...  
			};
			// on recieve new message implementation  
			that._oSocket.onmessage = function(evt) {
				that.getView().oRowRepeater.setBusy(false);
				var parsedData = JSON.parse(evt.data);
				// message of type "hello" means that the user has been connected to slack WebSocket API  
				if (parsedData.type === "hello") {
					if (!that._bConnected) {
						that._bConnected = true;
						// Load channels and chat history of the deafult channel  
						that.fetchInitialData();
					}
				}
				if (parsedData.type === "message") {
					if (parsedData.channel !== that._vChannel) {
						return;
					}
					var oModel = sap.ui.getCore().getModel();
					if (parsedData.subtype === "message_deleted") {
						that.removeMessageById(parsedData.deleted_ts, oModel);
					} else if (parsedData.subtype === "bot_message") {
						var bot = that.findBotByName(parsedData.username);
						if (bot) {
							oModel.oData.data.push({
								createdByName: bot.profile.real_name,
								message: parsedData.text,
								image_72: bot.profile.image_72,
								createdAt: moment.unix(parsedData.ts).fromNow(),
								ts: parsedData.ts
							});
						}
					} else {
						var user = that.findUserById(parsedData.user);
						if (user) {
							oModel.oData.data.push({
								createdByName: user.real_name !== undefined && user.real_name.length > 0 ? user.real_name : user.name,
								message: parsedData.text,
								image_72: user.profile.image_72,
								createdAt: moment.unix(parsedData.ts).fromNow(),
								ts: parsedData.ts
							});
						}
					}
					that.getView().oRowRepeater.setNumberOfRows(oModel.oData.data.length);
					that.scrollToBottom("messages-row-layout");
					oModel.refresh(false);
				}
			};
		});
	},
	listUsers: function(callback) {
		$.get("https://slack.com/api/users.list", {
			token: this._vToken
		}, callback);
	},
	removeMessageById: function(vMessageId, oModel) {
		var aMessages = oModel.oData.data;
		for (var i = 0; i < aMessages.length; i++) {
			if (aMessages[i].ts === vMessageId) {
				aMessages.splice(i, 1);
				return true;
			}
		}
		return false;
	},
	findUserById: function(vUserId) {
		if (!vUserId) {
			return;
		}
		var user = null;
		var oModel = sap.ui.getCore().getModel();
		for (var i = 0; i < oModel.oData.users.length; i++) {
			user = oModel.oData.users[i];
			if (user.id === vUserId) {
				break;
			}
		}
		return user;
	},
	findBotByName: function(vBotName) {
		var oModel = sap.ui.getCore().getModel();
		for (var i = 0; i < oModel.oData.users.length; i++) {
			var user = oModel.oData.users[i];
			if (user.name && user.name === vBotName) {
				return user;
			}
		}
	},
	fetchHistory: function(vChannelId, callback) {
		$.get("https://slack.com/api/channels.history", {
			token: this._vToken,
			count: 30,
			channel: vChannelId
				// inclusive: 1  
		}, callback);
	},
	fetchAvailabelChannels: function(callback) {
		$.get("https://slack.com/api/channels.list", {
			token: this._vToken,
			exclude_archived: true
		}, callback);
	},
	selectDefaultChannel: function(oModel) {
		for (var i = 0; i < oModel.oData.channels.length; i++) {
			var oChannel = oModel.oData.channels[i];
			if (oChannel.is_general) {
				this.oView.oChannelsComboBox.setSelectedKey(oChannel.id);
				this._vChannel = oChannel.id;
				break;
			}
		}
	},
	addMessageToList: function(oSlackMessage, oModel) {
		var user = this.findUserById(oSlackMessage.user);
		if (oSlackMessage.subtype !== undefined && oSlackMessage.subtype === "bot_message") {
			user = this.findBotByName(oSlackMessage.username);
			if (user) {
				console.log(user.profile.image_72);
			}
		} else {
			user = this.findUserById(oSlackMessage.user);
		}
		if (user) {
			oModel.oData.data.unshift({
				createdByName: user.profile.real_name !== undefined && user.profile.real_name.length > 0 ? user.profile.real_name : user.name,
				message: oSlackMessage.text,
				image_72: user.profile.image_72,
				createdAt: moment.unix(oSlackMessage.ts).fromNow(),
				ts: oSlackMessage.ts
			});
		}
	},
	onChannelChanged: function(oEvent) {
		oEvent.preventDefault();
		var oModel = sap.ui.getCore().getModel();
		oModel.oData.data = [];
		oModel.refresh(false);
		this._vChannel = oEvent.oSource.getSelectedKey();
		this.getView().oRowRepeater.setBusy(true);
		var that = this;
		this.fetchHistory(this._vChannel, function(historyData) {
			for (var i = 0; i < historyData.messages.length; i++) {
				that.addMessageToList(historyData.messages[i], oModel);
			}
			that.getView().oRowRepeater.setBusy(false);
			that.getView().oRowRepeater.setNumberOfRows(oModel.oData.data.length);
			oModel.refresh(false);
			that.scrollToBottom("messages-row-layout");
		});
	},
	onPostLiveChange: function(oEvent) {
		if (!this._bAutoGrowthSet) {
			this._bAutoGrowthSet = true;
			$(".new-post-ta").autogrow({
				onInitialize: false,
				fixMinHeight: true
			});
		}
		if (oEvent.oSource.getLiveValue().length === 0) {
			this.getView().oPostButton.setVisible(false);
		} else {
			this.getView().oPostButton.setVisible(true);
		}
	},
	onPostButtonPressed: function(oEvent) {
		var vMessage = this.getView().oPostTextArea.getValue();
		var that = this;
		$.post("https://slack.com/api/chat.postMessage", {
			token: that._vToken,
			channel: that._vChannel,
			text: vMessage,
			// username: "ranhsd",  
			as_user: true
		}, function(response) {});
		this.getView().oPostTextArea.setValue("");
	},
	fetchInitialData: function() {
		var oModel = sap.ui.getCore().getModel();
		var that = this;
		// fetch available chat channels for logged in user  
		this.fetchAvailabelChannels(function(data) {
			// store list of channels in global model and select the default channel  
			oModel.oData.channels = data.channels;
			that.selectDefaultChannel(oModel);
			// fetch the list of users in this channel  
			that.listUsers(function(responseData) {
				oModel.oData.users = responseData.members; // store the list of users in the global model  
				// fetch chat history of the selected channel  
				that.fetchHistory(that._vChannel, function(historyData) {
					// map slack api message object to data model object  
					for (var i = 0; i < historyData.messages.length; i++) {
						that.addMessageToList(historyData.messages[i], oModel);
					}
					that.getView().oRowRepeater.setBusy(false);
					that.getView().oRowRepeater.setNumberOfRows(oModel.oData.data.length);
					that.scrollToBottom("messages-row-layout");
					// bind the results to the UI  
					oModel.refresh(false);
				});
			});
		});
	},
	fetchLoggedInUser: function() {},
	onSettingsButtonClicked: function(oEvent) {
		var oSettingsToolPopup = this.getView().oSettingsDialog;
		if (oSettingsToolPopup.isOpen()) {
			oSettingsToolPopup.close();
		} else {
			oSettingsToolPopup.open();
		}
	},
	onConfigurationSaveChangesButtonClicked: function(oEvent) {
		// Parent of the button is the dialog  
		// so we can use get parent  
		oEvent.oSource.getParent().close();
	},
	onAuthTokenValueChanged: function(oEvent) {
		var sValue = oEvent.oSource.getValue();
		var that = this;
		if (sValue.length > 0 && sValue !== this._vToken) {
			this.testAuthenticationToken(sValue, function(data) {
				if (data.ok === true) {
					that._oStorage.put("slackAuthenticationToken", sValue);
					that._vToken = sValue;
					that.connectAndLoadData();
				} else {
					alert('Invalid Authentication token plese use another one');
					that.getView().oAuthTokenTextField.setValue("");
				}
			});
		} else if (sValue.length === 0) {
			if (this._oStorage.get("slackAuthenticationToken")) {
				this._oStorage.remove("slackAuthenticationToken");
			}
		}
	},
	onCloseConfigDialogClicked: function(oEvent) {
		oEvent.oSource.getParent().close();
	},
	testAuthenticationToken: function(vToken, callback) {
		$.get("https://slack.com/api/auth.test", {
			token: vToken
		}, callback);
	},
	getUserInfo: function(vUserId, callback) {
		$.get("https://slack.com/api/users.info", {
			token: this._vToken,
			user: vUserId
		}, callback);
	},
	scrollToBottom: function(sDivId) {
		setTimeout(function() {
			var oDiv = $("#" + sDivId);
			if (oDiv[0] !== undefined) {
				oDiv.scrollTop(oDiv[0].scrollHeight);
			}
		}, 0);
	}
});