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
	
};


instance.prototype.updateConfig = function(config) {
	var self = this;
	self.config = config;
	self.init_tcp();
};


instance.prototype.init_tcp = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.host) {
		self.socket = new tcp(self.config.host, 5555);
		//self.socket.options.reconnect_interval = 0
		//self.socket.socket.setKeepAlive(false)

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
		})

		self.socket.on('data', function (data) {});
	}

	// Send a message every 45 seconds to keep the connection from dropping, KVM switch times out after 60 seconds.
	if (self.config.keepAlive == true)
	{
		setInterval(function() {
			var cmd = Buffer.from([0x1B, 0x5B, 0x68, 0x07, 0x00, 0x00]);
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
		}
	};

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
