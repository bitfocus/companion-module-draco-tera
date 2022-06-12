var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;


function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);
	self.status(1,'Instance Initializing');
	self.actions(); // export actions
	return self;
}


instance.prototype.init = function() {
	var self = this;
	debug = self.debug;
	log = self.log;
	self.init_tcp();
	self.conList = '';
	self.cpuList = '';
	self.conListSet = false;
	self.cpuListSet = false;

};


instance.prototype.updateConfig = function(config) {
	var self = this;
	self.config = config;
	self.init_tcp();
	self.conListSet = false;
	self.cpuListSet = false;
};


instance.prototype.init_tcp = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.host) {
		self.socket = new tcp(self.config.host, 5555);

		self.socket.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.status(self.STATE_ERROR, err);
			self.log('error',"Network error: " + err.message);
		});

		self.socket.on('connect', function () {
			self.status(self.STATE_OK);
			debug("Connected");
			//Request con list
			var cmd = Buffer.from([0x1B, 0x5B, 0x68, 0x07, 0x00, 0x00, 0x00]);
			if (self.socket !== undefined) {
				debug('sending ', cmd, "to", self.socket.host);
				self.socket.send(cmd);
			}
			//Request cpu list
			var cmd = Buffer.from([0x1B, 0x5B, 0x67, 0x07, 0x00, 0x00, 0x00]);
			if (self.socket !== undefined) {
				debug('sending ', cmd, "to", self.socket.host);
				self.socket.send(cmd);
			}

		});

		self.socket.on('data', function (data) {

			//Convert the response hex to a string and if the substring 4,6 is 68 then the response is the CON list, if it is 67 it is the CPU list
			//Save these strings to the self.conList and self.cpuList variables for use later when building options list in actions
			if (self.conListSet == false){
				self.conList = '';
				dataString = data.toString('hex');
				if (dataString.substring(4,6) == "68"){
					self.conListSet = true;
					self.conList = dataString;
				}

			}
			if (self.cpuListSet == false){
				self.cpuList = '';
				dataString = data.toString('hex');
				if (dataString.substring(4,6) == "67"){
					self.cpuListSet = true;
					self.cpuList = dataString;
					self.actions();
				}

			}

			//*****TEST CODE FOR READING HEX RESPONSES   *******/
			//console.log(Object.keys(data));
			//for (let i = 0; i < Object.keys(data).length; i++) {
				//console.log(Buffer.from(data[Object.keys(data)[i]], 'hex').toString('utf8'));
			//}
			//console.log(data);
			//console.log(data.toString('hex')); print out data as hex text. ex: 1b5d6811042b000000b90b0000434f4e5f303430323337373733000000000400
			//for (let pair of data.entries()){
			//	console.log(pair);
			//}
			//function hex2a(hexx) {
				//var hex = hexx.toString();//force conversion
				//var str = '';
				//for (var i = 0; i < hex.length; i += 2)
					//str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
				//return str;
			//}
			//console.log(hex2a('434f4e5f30343032333737373300000000')); // returns '2460'
			//console.log(parseInt('0bc9', 16));


		});
	}



	// Send a message every 45 seconds to keep the connection from dropping, KVM switch times out after 60 seconds.
	if (self.config.keepAlive == true)
	{
		setInterval(function() {
			var cmd = Buffer.from([0x1B, 0x5B, 0x68, 0x07, 0x00, 0x00, 0x00]);
			if (self.socket !== undefined) {
				debug('sending ', cmd, "to", self.socket.host);
				self.socket.send(cmd);
			}
		}, 45000);
	}

};


// Fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module is for Draco Tera KVM'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 12,
			default: '192.168.100.99',
			regex: self.REGEX_IP
		},
		{
			type: 'checkbox',
			label: 'Keep Alive Message',
			id: 'keepAlive',
			default: false
		},
		{
			type: 'text',
			id: 'keepAliveInfo',
			width: 12,
			label: '',
			value: 'The keep alive message option sends a message to the switch every 45 seconds to keep the connection to the switch alive.'
		}
	];
};


// When module gets deleted
instance.prototype.destroy = function () {
		var self = this;

		if (self.socket !== undefined) {
			self.socket.destroy();
		}
		debug("destroy", self.id);
};


instance.prototype.actions = function (system) {
	var self = this;


	var actions = {

		'refresh-extender-list': {
			label: 'Refresh extender list',
			options: [{
				type: 'text',
				label: 'Refresh the list of extender units',
				id: 'refresh-extender'
			}]
		},
		'setconnection': {
			label: 'Set Connection CPU > CON',
			options: [{
				type: 'textinput',
				label: 'CPU Device Name',
				id: 'cpu-device-name',
				default: '',
				tooltip: 'Enter CPU Device Name',
			},{
				type: 'textinput',
				label: 'CPU',
				id: 'cpu',
				default: '',
				tooltip: 'Enter CPU Number',
				regex: self.REGEX_NUMBER
			},{
				type: 'textinput',
				label: 'CON Device Name',
				id: 'con-device-name',
				default: '',
				tooltip: 'Enter Con Device Name',
			},{
				type: 'textinput',
				label: 'CON',
				id: 'con',
				default: '',
				tooltip: 'Enter CON Number',
				regex: self.REGEX_NUMBER
			}]
		},
		'setconnection-bidirectional': {
			label: 'Set Connection CON > CPU (bidirectional)',
			options: [{
				type: 'textinput',
				label: 'CON Device Name',
				id: 'con-device-name',
				default: '',
				tooltip: 'Enter Con Device Name',
			},{
				type: 'textinput',
				label: 'CON',
				id: 'con',
				default: '',
				tooltip: 'Enter CON Number',
				regex: self.REGEX_NUMBER
			},{
				type: 'textinput',
				label: 'CPU Device Name',
				id: 'cpu-device-name',
				default: '',
				tooltip: 'Enter CPU Device Name',
			},{
				type: 'textinput',
				label: 'CPU',
				id: 'cpu',
				default: '',
				tooltip: 'Enter CPU Number',
				regex: self.REGEX_NUMBER
			}]
		},
		'setextendedconnection': {
			label: 'Set extended connection',
			options: [{
				type: 'textinput',
				label: 'CON Device Name',
				id: 'con-device-name',
				default: '',
				tooltip: 'Enter Con Device Name',
			},{
				type: 'textinput',
				label: 'CON',
				id: 'con',
				default: '',
				tooltip: 'Enter CON Number',
				regex: self.REGEX_NUMBER
			},{
				type: 'textinput',
				label: 'CPU Device Name',
				id: 'cpu-device-name',
				default: '',
				tooltip: 'Enter CPU Device Name',
			},{
				type: 'textinput',
				label: 'CPU',
				id: 'cpu',
				default: '',
				tooltip: 'Enter CPU Number',
				regex: self.REGEX_NUMBER
			},{
				type: 'dropdown',
				label: 'MODE',
				id: 'mode',
				default: 0,
				choices: [
						{ id: '0', label: 'Full Access' },
						{ id: '1', label: 'Video Only' },
						{ id: '3', label: 'Private Mode' }
				],
				tooltip: 'Enter Connection mode'
			}]
		},
		'setconnection-portmode': {
			label: 'Set Connection CPU > CON Port Mode',
			options: [{
				type: 'textinput',
				label: 'CPU Device Name',
				id: 'cpu-device-name',
				default: '',
				tooltip: 'Enter CPU Device Name',
			},{
				type: 'textinput',
				label: 'CPU',
				id: 'cpu',
				default: '',
				tooltip: 'Enter CPU Port Number',
				regex: self.REGEX_NUMBER
			},{
				type: 'textinput',
				label: 'CON Device Name',
				id: 'con-device-name',
				default: '',
				tooltip: 'Enter Con Device Name',
			},{
				type: 'textinput',
				label: 'CON',
				id: 'con',
				default: '',
				tooltip: 'Enter CON Port Number',
				regex: self.REGEX_NUMBER
			}]
		},
		'setconnection-bidirectional-portmode': {
			label: 'Set Connection CON > CPU (bidirectional) Port Mode',
			options: [{
				type: 'textinput',
				label: 'CON Device Name',
				id: 'con-device-name',
				default: '',
				tooltip: 'Enter Con Device Name',
			},{
				type: 'textinput',
				label: 'CON',
				id: 'con',
				default: '',
				tooltip: 'Enter CON Port Number',
				regex: self.REGEX_NUMBER
			},{
				type: 'textinput',
				label: 'CPU Device Name',
				id: 'cpu-device-name',
				default: '',
				tooltip: 'Enter CPU Device Name',
			},{
				type: 'textinput',
				label: 'CPU',
				id: 'cpu',
				default: '',
				tooltip: 'Enter CPU Port Number',
				regex: self.REGEX_NUMBER
			}]
		},
		'setconnection-namemode': {
			label: 'Set Connection CPU > CON Name Mode',
			options: [{
				type: 'dropdown',
				label: 'CPU',
				id: 'cpu',
				tooltip: 'Enter CPU device name',
				choices: [],
				minChoicesForSearch: 0
			},{
				type: 'dropdown',
				label: 'CON',
				id: 'con',
				tooltip: 'Enter CON device name',
				choices: [],
				minChoicesForSearch: 0
			}]
		},
		'setconnection-bidirectional-namemode': {
			label: 'Set Connection CON > CPU (bidirectional) Name Mode',
			options: [{
				type: 'dropdown',
				label: 'CPU',
				id: 'cpu',
				tooltip: 'Enter CPU device name',
				choices: [],
				minChoicesForSearch: 0
			},{
				type: 'dropdown',
				label: 'CON',
				id: 'con',
				tooltip: 'Enter CON device name',
				choices: [],
				minChoicesForSearch: 0
			}]
		},
		'setextendedconnection-namemode': {
			label: 'Set extended connection Name Mode',
			options: [{
				type: 'dropdown',
				label: 'CPU',
				id: 'cpu',
				tooltip: 'Enter CPU device name',
				choices: [],
				minChoicesForSearch: 0
			},{
				type: 'dropdown',
				label: 'CON',
				id: 'con',
				tooltip: 'Enter CON device name',
				choices: [],
				minChoicesForSearch: 0
			},{
				type: 'dropdown',
				label: 'MODE',
				id: 'mode',
				default: 0,
				choices: [
						{ id: '0', label: 'Full Access' },
						{ id: '1', label: 'Video Only' },
						{ id: '3', label: 'Private Mode' }
				],
				tooltip: 'Enter Connection mode'
			}]
		}
	};
	// If the CPU list has been set then we know both lists, CON and CPU, have been set and we can build the list of options for the namemode actions above.
	if (self.cpuListSet == true){
		//This function converts the hex string to an ascii string
		function hex2a(hexx) {
			var hex = hexx.toString();//force conversion
			var str = '';
			for (var i = 0; i < hex.length; i += 2)
				str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
			return str;
		}
		//console.log(self.conList);

		self.conDict = [];
		self.cpuDict = [];

		actions['setconnection-namemode'].options[1].choices = [];
		actions['setconnection-bidirectional-namemode'].options[1].choices = [];
		actions['setextendedconnection-namemode'].options[1].choices = [];

		telegramSizeHex = this.conList.substring(6,10);
		telegramSize = parseInt(telegramSizeHex.substring(2,3) + telegramSizeHex.substring(3,4) + telegramSizeHex.substring(0,1) + telegramSizeHex.substring(1,2), 16) * 2;
		for (var i = 18; i < telegramSize; i = i + 48){

			// Parse the 24 pairs to get the hex code and convert to int or text based on position
			thisID = self.conList.substring(i, i+8);
			thisID = parseInt(thisID.substring(2,3) + thisID.substring(3,4) + thisID.substring(0,1) + thisID.substring(1,2), 16);
			thisName = hex2a(self.conList.substring(i+8, i+42));
			thisOnlineStatus = self.conList.substring(i+42,i+44);
			if (thisOnlineStatus != '00'){ // && thisID > 3000 && thisID < 4000){
				actions['setconnection-namemode'].options[1].choices.push({id: thisID, label: thisName + ' - ' + thisID});
				actions['setconnection-bidirectional-namemode'].options[1].choices.push({id: thisID, label: thisName + ' - ' + thisID});
				actions['setextendedconnection-namemode'].options[1].choices.push({id: thisID, label: thisName + ' - ' + thisID});


			}

		}
		//Sort the lists of options alphabetically
		actions['setconnection-namemode'].options[1].choices.sort((a, b) => {
			let fa = a.label.toLowerCase(),
				fb = b.label.toLowerCase();

			if (fa < fb) {
				return -1;
			}
			if (fa > fb) {
				return 1;
			}
			return 0;
		});
		actions['setconnection-bidirectional-namemode'].options[1].choices.sort((a, b) => {
			let fa = a.label.toLowerCase(),
				fb = b.label.toLowerCase();

			if (fa < fb) {
				return -1;
			}
			if (fa > fb) {
				return 1;
			}
			return 0;
		});
		actions['setextendedconnection-namemode'].options[1].choices.sort((a, b) => {
			let fa = a.label.toLowerCase(),
				fb = b.label.toLowerCase();

			if (fa < fb) {
				return -1;
			}
			if (fa > fb) {
				return 1;
			}
			return 0;
		});

		actions['setconnection-namemode'].options[0].choices = [];
		actions['setconnection-bidirectional-namemode'].options[0].choices = [];
		actions['setextendedconnection-namemode'].options[0].choices = [];

		telegramSizeHex = this.cpuList.substring(6,10);
		telegramSize = parseInt(telegramSizeHex.substring(2,3) + telegramSizeHex.substring(3,4) + telegramSizeHex.substring(0,1) + telegramSizeHex.substring(1,2), 16) * 2;
		for (var i = 18; i < telegramSize; i = i + 48){

			// Parse the 24 pairs to get the hex code and convert to int or text based on position
			thisID = self.cpuList.substring(i, i+8);
			thisID = parseInt(thisID.substring(2,3) + thisID.substring(3,4) + thisID.substring(0,1) + thisID.substring(1,2), 16);
			thisName = hex2a(self.cpuList.substring(i+8, i+42));
			thisOnlineStatus = self.cpuList.substring(i+42,i+44);
			if (thisOnlineStatus != '00'){ //} && thisID > 1000 && thisID < 2000){
				actions['setconnection-namemode'].options[0].choices.push({id: thisID, label: thisName + ' - ' + thisID});
				actions['setconnection-bidirectional-namemode'].options[0].choices.push({id: thisID, label: thisName + ' - ' + thisID});
				actions['setextendedconnection-namemode'].options[0].choices.push({id: thisID, label: thisName + ' - ' + thisID});
			}
		}
		//Sort the lists of options alphabetically
		actions['setconnection-namemode'].options[0].choices.sort((a, b) => {
			let fa = a.label.toLowerCase(),
				fb = b.label.toLowerCase();

			if (fa < fb) {
				return -1;
			}
			if (fa > fb) {
				return 1;
			}
			return 0;
		});
		actions['setconnection-bidirectional-namemode'].options[0].choices.sort((a, b) => {
			let fa = a.label.toLowerCase(),
				fb = b.label.toLowerCase();

			if (fa < fb) {
				return -1;
			}
			if (fa > fb) {
				return 1;
			}
			return 0;
		});
		actions['setextendedconnection-namemode'].options[0].choices.sort((a, b) => {
			let fa = a.label.toLowerCase(),
				fb = b.label.toLowerCase();

			if (fa < fb) {
				return -1;
			}
			if (fa > fb) {
				return 1;
			}
			return 0;
		});
	}

	self.setActions(actions);
};


instance.prototype.action = function (action) {
		var self = this;
		var id = action.action;
		var opt = action.options;
		var cmd;

		// function getHexPart(d, /*short integer*/ p  /*part 0 or 1*/) {
		// 	var cp = Number(d).toString(16);
		// 	cp = "0000".substring(0,4 - cp.length) + cp;
		// 	// debug(cp.substring(p*2,(p+1)*2))
		// 	return cp.substring(p*2,(p+1)*2)
		// }

		switch (id) {

			case 'refresh-extender-list':
				self.conListSet = false;
				self.cpuListSet = false;
				self.conList = '';
				self.cpuList = '';
				//Request con list
				var cmd = Buffer.from([0x1B, 0x5B, 0x68, 0x07, 0x00, 0x00, 0x00]);
				if (self.socket !== undefined) {
					debug('sending ', cmd, "to", self.socket.host);
					self.socket.send(cmd);
				}
				//Request cpu list
				var cmd = Buffer.from([0x1B, 0x5B, 0x67, 0x07, 0x00, 0x00, 0x00]);
				if (self.socket !== undefined) {
					debug('sending ', cmd, "to", self.socket.host);
					self.socket.send(cmd);
				}

			break

			case 'setconnection':
				//cmd = '0x1B 0x5B 0x49 0x09 0x00 0xC9 0x0B 0xF4 0x03';

				// cmd = Buffer.from([
				// 	0x1B,
				// 	0x5B,
				// 	0x49,
				// 	0x09,
				// 	0x00,
				// 	parseInt(opt.cpu),
				// 	parseInt(opt.con)
				// ]);

				//cmd = Buffer.from( "1B5B490900"+getHexPart(opt.con,1)+getHexPart(opt.con,0)+getHexPart(opt.cpu,1)+getHexPart(opt.cpu,0), "hex")

				var cmd = Buffer.from([0x1B, 0x5B, 0x49, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00]);
				cmd.writeUInt16LE(parseInt(opt.con), 5);
				cmd.writeUInt16LE(parseInt(opt.cpu), 7);
				debug('CMD setconnection:  ', cmd);

			break

			case 'setconnection-bidirectional':
				var cmd = Buffer.from([0x1B, 0x5B, 0x50, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00]);
				cmd.writeUInt16LE(parseInt(opt.cpu), 5);
				cmd.writeUInt16LE(parseInt(opt.con), 7);
				debug('CMD setconnection-bidirectional:  ', cmd);
			break


			case 'setextendedconnection':
									//0x1B, 0x5B, 0x62, 0x0B, 0x00, 0xF4, 0x03, 0xC9, 0x0B, 0x02, 0x00
				var cmd = Buffer.from([0x1B, 0x5B, 0x62, 0x0B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
				cmd.writeUInt16LE(parseInt(opt.cpu), 5);
				cmd.writeUInt16LE(parseInt(opt.con), 7);
				cmd.writeUInt16LE(parseInt(opt.mode), 9);
				debug('CMD setextendedconnection:  ', cmd);
			break

			case 'setconnection-portmode':
				//cmd = '0x1B 0x5B 0x49 0x09 0x00 0xC9 0x0B 0xF4 0x03';

				// cmd = Buffer.from([
				// 	0x1B,
				// 	0x5B,
				// 	0x49,
				// 	0x09,
				// 	0x00,
				// 	parseInt(opt.cpu),
				// 	parseInt(opt.con)
				// ]);

				//cmd = Buffer.from( "1B5B490900"+getHexPart(opt.con,1)+getHexPart(opt.con,0)+getHexPart(opt.cpu,1)+getHexPart(opt.cpu,0), "hex")

				var cmd = Buffer.from([0x1B, 0x5B, 0x46, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00]);
				cmd.writeUInt16LE(parseInt(opt.con), 5);
				cmd.writeUInt16LE(parseInt(opt.cpu), 7);
				debug('CMD setconnection:  ', cmd);

			break

			case 'setconnection-bidirectional-portmode':
				var cmd = Buffer.from([0x1B, 0x5B, 0x43, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00]);
				cmd.writeUInt16LE(parseInt(opt.con), 5);
				cmd.writeUInt16LE(parseInt(opt.cpu), 7);
				debug('CMD setconnection-bidirectional:  ', cmd);
			break

			case 'setconnection-namemode':
				var cmd = Buffer.from([0x1B, 0x5B, 0x49, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00]);
				cmd.writeUInt16LE(parseInt(opt.con), 5);
				cmd.writeUInt16LE(parseInt(opt.cpu), 7);
				debug('CMD setconnection namemode:  ', cmd);

			break

			case 'setconnection-bidirectional-namemode':
				var cmd = Buffer.from([0x1B, 0x5B, 0x50, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00]);
				cmd.writeUInt16LE(parseInt(opt.cpu), 5);
				cmd.writeUInt16LE(parseInt(opt.con), 7);
				debug('CMD setconnection-bidirectional namemode:  ', cmd);
			break

			case 'setextendedconnection-namemode':
				var cmd = Buffer.from([0x1B, 0x5B, 0x62, 0x0B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
				cmd.writeUInt16LE(parseInt(opt.cpu), 5);
				cmd.writeUInt16LE(parseInt(opt.con), 7);
				cmd.writeUInt16LE(parseInt(opt.mode), 9);
				debug('CMD setextendedconnection namemode:  ', cmd);
			break

		}

		if (cmd !== undefined) {
			if (self.socket !== undefined) {
				debug('sending ', cmd, "to", self.socket.host);
				self.socket.send(cmd);
			}
		}
};


instance_skel.extendedBy(instance);
exports = module.exports = instance;
