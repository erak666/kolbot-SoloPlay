/*
*	@filename	PatherOverrides.js
*	@author		theBGuy, isid0re
*	@desc		Pather.js fixes to improve functionality
*/

if (!isIncluded("common/Pather.js")) { include("common/Pather.js"); }
Developer.debugging.pathing && (PathDebug.enableHooks = true);

// TODO: clean up this mess
NodeAction.killMonsters = function (arg) {
	// sanityCheck from isid0re - added paladin specific areas - theBGuy
	let monList, 
		sanityCheck = !!([62, 63, 64, 74].includes(me.area) || (me.paladin && [8, 9, 10, 11, 12, 13, 14, 15, 16, 94, 95, 96, 97, 98, 99].includes(me.area)));

	if (Attack.stopClear) return;

	if ([8, 3, 4, 38, 5, 6, 27, 28, 33, 37, 56, 57, 60, 45, 58, 66, 67, 68, 69, 70, 71, 72].includes(me.area)) {
		monList = Attack.getMob([58, 59, 60, 61, 101, 102, 103, 104], 0, 30);

		if (monList) {
			Attack.clear(7, 0);
			Attack.clearList(monList);
		}
	}

	if (me.area === sdk.areas.MooMooFarm) {
		let king = getUnit(sdk.unittype.Monster, getLocaleString(sdk.locale.monsters.TheCowKing));
		let kingPreset = getPresetUnit(me.area, sdk.unittype.Monster, sdk.monsters.preset.TheCowKing);

		if (king) {
			do {
				if (getDistance(me.x, me.y, getRoom(kingPreset.roomx * 5 + kingPreset.x), getRoom(kingPreset.roomy * 5 + kingPreset.y)) <= 25) {
					Town.goToTown();
					print('ÿc8Kolbot-SoloPlayÿc0: exit cows. Near the king');
					me.overhead('Exit cows. Near the king');
				}
			} while (king.getNext());
		}
	}

	if (me.area === sdk.areas.DenofEvil && me.hell && me.druid) {
		let corpsefire = getUnit(sdk.unittype.Monster, getLocaleString(sdk.locale.monsters.Corpsefire));

		if (corpsefire) {
			do {
				if (Attack.getResist(corpsefire, "cold") >= 100 && Attack.getResist(corpsefire, "physical") >= 100) {
					Town.goToTown();
					print('ÿc8Kolbot-SoloPlayÿc0: Exit den. Corpsefire is immune to cold and physical');
					me.overhead('Exit den. Corpsefire is immune to cold and physical');
					D2Bot.printToConsole('ÿc8Kolbot-SoloPlayÿc0: exit den. Corpsefire is immune to cold and physical', 8);
				}
			} while (corpsefire.getNext());
		}
	}

	if ((typeof Config.ClearPath === "number" || typeof Config.ClearPath === "object") && arg.clearPath === false) {
		switch (typeof Config.ClearPath) {
		case "number":
			Attack.clear(sanityCheck ? 7 : Pather.useTeleport() ? 15 : 30, Config.ClearPath);

			break;
		case "object":
			if (!Config.ClearPath.hasOwnProperty("Areas") || Config.ClearPath.Areas.length === 0 || Config.ClearPath.Areas.includes(me.area)) {
				Attack.clear(sanityCheck ? 7 : Pather.useTeleport() ? 15 : Config.ClearPath.Range, Pather.useTeleport() ? Config.ClearPath.Spectype : 0);
			}

			break;
		}
	}

	if (arg.clearPath !== false) {
		Attack.clear(sanityCheck ? 7 : 15, typeof arg.clearPath === "number" ? arg.clearPath : 0);
	}
};

NodeAction.popChests = function () {
	let range = Pather.useTeleport() ? 25 : 15;
	me.getMobCount(10) > 3 && (range = 8);
	Config.OpenChests && Misc.openChests(range);
	Misc.useWell(range);
};

Pather.haveTeleCharges = false;
Pather.forceWalk = false;
Pather.forceRun = false;

/**
 * @author Jaenster
 * @description Some prototypes on objects
 */
(function (global) {
	let coords = function () {
		if (Array.isArray(this) && this.length > 1) {
			return [this[0], this[1]];
		}

		if (typeof this.x !== 'undefined' && typeof this.y !== 'undefined') {
			return this instanceof PresetUnit && [this.roomx * 5 + this.x, this.roomy * 5 + this.y] || [this.x, this.y]
		}

		return [undefined, undefined];
	};

	Object.prototype.mobCount = function (range = 5) {
		let [x, y] = coords.apply(this);
			return getUnits(sdk.unittype.Monster)
				.filter(function (mon) {
					return mon.attackable && getDistance(x, y, mon.x, mon.y) < range &&
					!CollMap.checkColl({x: x, y: y}, mon, Coords_1.BlockBits.BlockWall | Coords_1.BlockBits.ClosedDoor | Coords_1.BlockBits.LineOfSight, 1);
				}).length;
	};

	Object.defineProperties(Object.prototype, {
		moveTo: {
			get: function () {
				return typeof this.____moveTo__cb === 'function' && this.____moveTo__cb || (() => Pather.moveTo.apply(Pather, coords.apply(this)));
			},
			set: function (cb) {
				this.____moveTo__cb = cb;
			},
			enumerable: false,
		},
		path: {
			get: function () {
				let useTeleport = Pather.useTeleport();
				return getPath.apply(this, [typeof this.area !== 'undefined' ? this.area : me.area, me.x, me.y, ...coords.apply(this), useTeleport ? 1 : 0, useTeleport ? ([62, 63, 64].indexOf(me.area) > -1 ? 30 : Pather.teleDistance) : Pather.walkDistance])
			},
			enumerable: false,
		},
		validSpot: {
			get: function () {
				let [x, y] = coords.apply(this), result;
				if (!me.area || !x || !y) { // Just in case
					return false;
				}

				try { // Treat thrown errors as invalid spot
					result = getCollision(me.area, x, y);
				} catch (e) {
					// Dont care
				}

				// Avoid non-walkable spots, objects
				return !(result === undefined || (result & 0x1) || (result & 0x400));
			},
			enumerable: false,
		},
		click: {
			get: function () {
				return function (button = 0, shift = false) {
					if (this instanceof Unit) {
						switch (this.type) {
							case 4: //ToDo; fix that items that we own, we click on
							default:
								print('Click button');
								clickMap(button, 0, this);
								delay(20);
								clickMap(button + 2, 0, this);
						}
					}
				}
			}
		}
	});
})(typeof global !== 'undefined' ? global : this);

Pather.checkForTeleCharges = function () {
	this.haveTeleCharges = Attack.getItemCharges(sdk.skills.Teleport);
};

Pather.canUseTeleCharges = function () {
	if (me.classic || me.inTown || me.shapeshifted) return false;

	// Charges are costly so make sure we have enough gold to handle repairs unless we are in maggot lair since thats a pita and worth the gold spent
	if (me.gold < 500000 && [sdk.areas.MaggotLairLvl1, sdk.areas.MaggotLairLvl2, sdk.areas.MaggotLairLvl3].indexOf(me.area) === -1) {
		return false;
	}

	return this.haveTeleCharges;
};

Pather.teleportTo = function (x, y, maxRange = 5) {
	Developer.debugging.pathing && print("Mob Count at next node: " + [x, y].mobCount());
	
	for (let i = 0; i < 3; i += 1) {
		Config.PacketCasting ? Skill.setSkill(sdk.skills.Teleport, 0) && Packet.castSkill(0, x, y) : Skill.cast(sdk.skills.Teleport, 0, x, y);
		let tick = getTickCount();

		while (getTickCount() - tick < Math.max(500, me.ping * 2 + 200)) {
			if (getDistance(me.x, me.y, x, y) < maxRange) {
				return true;
			}

			delay(10);
		}
	}

	return false;
};

Pather.teleUsingCharges = function (x, y, maxRange = 5) {
	let orgSlot = me.weaponswitch;

	for (let i = 0; i < 3; i++) {
		me.castChargedSkill(sdk.skills.Teleport, x, y);
		let tick = getTickCount();

		while (getTickCount() - tick < Math.max(500, me.ping * 2 + 200)) {
			if (getDistance(me.x, me.y, x, y) < maxRange) {
				me.weaponswitch !== orgSlot && me.switchWeapons(orgSlot);
				return true;
			}

			delay(10);
		}
	}

	if (me.gold > me.getRepairCost() * 3 && Town.canTpToTown()) {
		console.debug("Tele-Charge repair");
		Town.visitTown(true);
	} else {
		this.haveTeleCharges = false;
	}

	me.weaponswitch !== orgSlot && me.switchWeapons(orgSlot);

	return false;
};

Pather.checkWP = function (area = 0, keepMenuOpen = false) {
	while (!me.gameReady) {
		delay(250 + me.ping);
	}

	if (!getWaypoint(Pather.wpAreas.indexOf(area))) {
		!me.getSkill(sdk.skills.Telekinesis, 1) && me.inTown && Town.move("waypoint");

		for (let i = 0; i < 15; i++) {
			let wp = getUnit(sdk.unittype.Object, "waypoint");

			if (wp && wp.area === me.area) {
				if (Skill.useTK(wp) && i < 2) {
					if (wp.distance > 21) {
						Attack.getIntoPosition(wp, 20, 0x4);
					}

					Skill.cast(sdk.skills.Telekinesis, 0, wp);
				} else if (wp.distance > 7) {
					this.moveToUnit(wp);
				}

				!getUIFlag(sdk.uiflags.Waypoint) && Misc.click(0, 0, wp);

				let tick = getTickCount();

				while (getTickCount() - tick < Math.max(Math.round((i + 1) * 1000 / (i / 5 + 1)), (1 + me.ping * 2))) {
					if (getUIFlag(sdk.uiflags.Waypoint)) {
						delay(500 + me.ping);
						break;
					}

					delay(50 + me.ping);
				}
			} else {
				me.inTown && Town.move("waypoint");
			}

			if (getUIFlag(sdk.uiflags.Waypoint)) {
				!keepMenuOpen && me.cancel();
				break;
			}
		}
		// go ahead and close out of wp menu if we don't have the wp
		!getWaypoint(Pather.wpAreas.indexOf(area)) && getUIFlag(sdk.uiflags.Waypoint) && me.cancel();
	}

	return getWaypoint(Pather.wpAreas.indexOf(area));
};

Pather.changeAct = function () {
	let npc, loc, act = me.act + 1;
	let quest;

	switch (act) {
	case 2:
		npc = "Warriv";
		loc = sdk.areas.LutGholein;

		break;
	case 3:
		npc = "Meshif";
		loc = sdk.areas.KurastDocktown;

		break;
	case 5:
		npc = "Tyrael";
		loc = sdk.areas.Harrogath;

		break;
	default:
		return false;
	}

	!me.inTown && Town.goToTown();

	let npcUnit = Town.npcInteract(npc);
	let timeout = getTickCount() + 3000;

	if (!npcUnit) {
		while (!npcUnit && timeout < getTickCount()) {
			Town.move(NPC[npc]);
			Packet.flash(me.gid);
			delay(me.ping * 2 + 100);
			npcUnit = getUnit(sdk.unittype.NPC, npc);
		}
	}

	if (npcUnit) {
		for (let i = 0; i < 5; i++) {
			sendPacket(1, 56, 4, 0, 4, npcUnit.gid, 4, loc);
			delay(500 + me.ping);

			if (me.act === act) {
				break;
			}
		}
	} else {
		myPrint("Failed to move to " + npc);
	}

	while (!me.gameReady) {
		delay(100);
	}

	return me.act === act;
};

Pather.moveNear = function (x, y, minDist, givenSettings = {}) {
	// Abort if dead
	if (me.dead) return false;
	let settings = Object.assign({}, {
		allowTeleport: true,
		clearPath: true,
		pop: false,
		returnSpotOnError: true
	}, givenSettings);

	let path, adjustedNode, cleared, leaped = false,
		node = {x: x, y: y},
		fail = 0;

	for (let i = 0; i < this.cancelFlags.length; i += 1) {
		getUIFlag(this.cancelFlags[i]) && me.cancel();
	}

	if (!x || !y) return false; // I don't think this is a fatal error so just return false
	if (typeof x !== "number" || typeof y !== "number") { throw new Error("moveNear: Coords must be numbers"); }

	let useTele = settings.allowTeleport && this.useTeleport();
	let useChargedTele = settings.allowTeleport && this.canUseTeleCharges();
	let tpMana = Skill.getManaCost(sdk.skills.Teleport);
	minDist === undefined && (minDist = me.inTown ? 2 : 5);
	({x, y} = this.spotOnDistance(node, minDist, me.area, settings.returnSpotOnError));
	if (getDistance(me, x, y) < 2) return true;
	path = getPath(me.area, x, y, me.x, me.y, useTele || useChargedTele ? 1 : 0, useTele || useChargedTele ? ([sdk.areas.MaggotLairLvl1, sdk.areas.MaggotLairLvl2, sdk.areas.MaggotLairLvl3].includes(me.area) ? 30 : this.teleDistance) : this.walkDistance);

	if (!path) { throw new Error("moveNear: Failed to generate path."); }

	path.reverse();
	settings.pop && path.pop();
	PathDebug.drawPath(path);
	useTele && Config.TeleSwitch && path.length > 5 && me.switchWeapons(Attack.getPrimarySlot() ^ 1);

	while (path.length > 0) {
		// Abort if dead
		if (me.dead) return false;

		for (let i = 0; i < this.cancelFlags.length; i += 1) {
			getUIFlag(this.cancelFlags[i]) && me.cancel();
		}

		node = path.shift();

		if (getDistance(me, node) > 2) {
			if ([sdk.areas.MaggotLairLvl1, sdk.areas.MaggotLairLvl2, sdk.areas.MaggotLairLvl3].includes(me.area)) {
				adjustedNode = this.getNearestWalkable(node.x, node.y, 15, 3, 0x1 | 0x4 | 0x800 | 0x1000);

				if (adjustedNode) {
					node.x = adjustedNode[0];
					node.y = adjustedNode[1];
				}
			}

			if (useTele && tpMana <= me.mp ? this.teleportTo(node.x, node.y) : useChargedTele && getDistance(me, node) >= 15 ? this.teleUsingCharges(node.x, node.y) : this.walkTo(node.x, node.y, (fail > 0 || me.inTown) ? 2 : 4)) {
				if (!me.inTown) {
					if (this.recursion) {
						this.recursion = false;

						NodeAction.go({clearPath: settings.clearPath});

						if (getDistance(me, node.x, node.y) > 5) {
							this.moveNear(node.x, node.y);
						}

						this.recursion = true;
					}

					Misc.townCheck();
				}
			} else {
				if (fail > 0 && !useTele && !me.inTown) {
					if (!cleared) {
						Attack.clear(5) && Misc.openChests(2);
						cleared = true;
					}

					// Only do this once
					if (fail > 1 && me.getSkill(sdk.skills.LeapAttack, 1) && !leaped) {
						Skill.cast(sdk.skills.LeapAttack, 0, node.x, node.y);
						leaped = true;
					}
				}

				path = getPath(me.area, x, y, me.x, me.y, useTele ? 1 : 0, useTele ? rand(25, 35) : rand(10, 15));
				if (!path) { throw new Error("moveNear: Failed to generate path."); }

				fail += 1;
				path.reverse();
				PathDebug.drawPath(path);
				settings.pop && path.pop();
				print("move retry " + fail);

				if (fail > 0) {
					Packet.flash(me.gid);
					Attack.clear(5) && Misc.openChests(2);

					if (fail >= 15) {
						break;
					}
				}
			}
		}

		delay(5);
	}

	useTele && Config.TeleSwitch && me.switchWeapons(Attack.getPrimarySlot() ^ 1);
	PathDebug.removeHooks();

	return getDistance(me, node.x, node.y) < 5;
};

Pather.moveTo = function (x = undefined, y = undefined, retry = undefined, clearPath = true, pop = false) {
	// Abort if dead
	if (me.dead) return false;

	let path, adjustedNode, cleared, leaped = false,
		node = {x: x, y: y},
		fail = 0;

	for (let i = 0; i < this.cancelFlags.length; i += 1) {
		getUIFlag(this.cancelFlags[i]) && me.cancel();
	}

	//if (!x || !y) { throw new Error("moveTo: Function must be called with at least 2 arguments."); }
	if (!x || !y) return false; // I don't think this is a fatal error so just return false
	if (typeof x !== "number" || typeof y !== "number") { throw new Error("moveTo: Coords must be numbers"); }
	if (getDistance(me, x, y) < 2) return true;

	(retry === undefined || retry === 3) && (retry = 15);

	let useTele = this.useTeleport();
	let useChargedTele = this.canUseTeleCharges();
	let tpMana = Skill.getManaCost(sdk.skills.Teleport);
	path = getPath(me.area, x, y, me.x, me.y, useTele || useChargedTele ? 1 : 0, useTele || useChargedTele ? ([sdk.areas.MaggotLairLvl1, sdk.areas.MaggotLairLvl2, sdk.areas.MaggotLairLvl3].includes(me.area) ? 30 : this.teleDistance) : this.walkDistance);

	if (!path) { throw new Error("moveTo: Failed to generate path."); }

	path.reverse();
	pop && path.pop();
	PathDebug.drawPath(path);
	useTele && Config.TeleSwitch && path.length > 5 && me.switchWeapons(Attack.getPrimarySlot() ^ 1);

	while (path.length > 0) {
		// Abort if dead
		if (me.dead) return false;

		for (let i = 0; i < this.cancelFlags.length; i += 1) {
			if (getUIFlag(this.cancelFlags[i])) me.cancel();
		}

		node = path.shift();

		if (getDistance(me, node) > 2) {
			if ([sdk.areas.MaggotLairLvl1, sdk.areas.MaggotLairLvl2, sdk.areas.MaggotLairLvl3].includes(me.area)) {
				adjustedNode = this.getNearestWalkable(node.x, node.y, 15, 3, 0x1 | 0x4 | 0x800 | 0x1000);

				if (adjustedNode) {
					node.x = adjustedNode[0];
					node.y = adjustedNode[1];
				}
			}

			if (useTele && tpMana <= me.mp ? this.teleportTo(node.x, node.y) : useChargedTele && getDistance(me, node) >= 15 ? this.teleUsingCharges(node.x, node.y) : this.walkTo(node.x, node.y, (fail > 0 || me.inTown) ? 2 : 4)) {
				if (!me.inTown) {
					if (this.recursion) {
						this.recursion = false;

						NodeAction.go({clearPath: clearPath});

						if (getDistance(me, node.x, node.y) > 5) {
							this.moveTo(node.x, node.y);
						}

						this.recursion = true;
					}

					Misc.townCheck();
				}
			} else {
				if (fail > 0 && !useTele && !me.inTown) {
					if (!cleared) {
						Attack.clear(5) && Misc.openChests(2);
						cleared = true;
					}

					// Only do this once
					if (fail > 1 && me.getSkill(sdk.skills.LeapAttack, 1) && !leaped) {
						Skill.cast(sdk.skills.LeapAttack, 0, node.x, node.y);
						leaped = true;
					}
				}

				path = getPath(me.area, x, y, me.x, me.y, useTele ? 1 : 0, useTele ? rand(25, 35) : rand(10, 15));
				if (!path) { throw new Error("moveTo: Failed to generate path."); }

				fail += 1;
				path.reverse();
				PathDebug.drawPath(path);
				pop && path.pop();
				print("move retry " + fail);

				if (fail > 0) {
					Packet.flash(me.gid);
					Attack.clear(5) && Misc.openChests(2);

					if (fail >= retry) {
						break;
					}
				}
			}
		}

		delay(5);
	}

	useTele && Config.TeleSwitch && me.switchWeapons(Attack.getPrimarySlot() ^ 1);
	PathDebug.removeHooks();

	return getDistance(me, node.x, node.y) < 5;
};

Pather.moveToLoc = function (target, givenSettings) {
	// Abort if dead
	if (me.dead || !target) return false;
	let settings = Object.assign({}, {
		allowTeleport: true,
		allowClearing: true,
		allowTown: true,
		retry: 15,
		pop: false,
		clearType: 0
	}, givenSettings);

	// convert presetunit to x,y target
    if (target instanceof PresetUnit) {
        target = { x: target.roomx * 5 + target.x, y: target.roomy * 5 + target.y };
    }

	let path, adjustedNode, cleared, leaped = false,
		node = {x: target.x, y: target.y},
		fail = 0;

	for (let i = 0; i < this.cancelFlags.length; i += 1) {
		if (getUIFlag(this.cancelFlags[i])) me.cancel();
	}

	if (!target.x || !target.y) return false; // I don't think this is a fatal error so just return false
	if (typeof target.x !== "number" || typeof target.y !== "number") { return false; }
	if (getDistance(me, target) < 2 && !CollMap.checkColl(me, target, Coords_1.Collision.BLOCK_MISSILE, 5)) return true;

	let useTele = settings.allowTeleport && (getDistance(me, target) > 15 || me.diff || me.act > 3) && this.useTeleport();
	let useChargedTele = settings.allowTeleport && this.canUseTeleCharges();
	let usingTele = (useTele || useChargedTele);
	let tpMana = Skill.getManaCost(sdk.skills.Teleport);
	path = getPath(me.area, target.x, target.y, me.x, me.y, usingTele ? 1 : 0, usingTele ? ([sdk.areas.MaggotLairLvl1, sdk.areas.MaggotLairLvl2, sdk.areas.MaggotLairLvl3].includes(me.area) ? 30 : this.teleDistance) : this.walkDistance);

	if (!path) { throw new Error("moveTo: Failed to generate path."); }

	path.reverse();
	settings.pop && path.pop();
	PathDebug.drawPath(path);
	useTele && Config.TeleSwitch && path.length > 5 && me.switchWeapons(Attack.getPrimarySlot() ^ 1);

	while (path.length > 0) {
		// Abort if dead
		if (me.dead) return false;

		for (let i = 0; i < this.cancelFlags.length; i += 1) {
			if (getUIFlag(this.cancelFlags[i])) me.cancel();
		}

		node = path.shift();

		if (getDistance(me, node) > 2) {
			if ([sdk.areas.MaggotLairLvl1, sdk.areas.MaggotLairLvl2, sdk.areas.MaggotLairLvl3].includes(me.area)) {
				adjustedNode = this.getNearestWalkable(node.x, node.y, 15, 3, 0x1 | 0x4 | 0x800 | 0x1000);

				if (adjustedNode) {
					node.x = adjustedNode[0];
					node.y = adjustedNode[1];
				}
			}

			if (useTele && tpMana <= me.mp ? this.teleportTo(node.x, node.y) : useChargedTele && (getDistance(me, node) >= 15 || me.area === sdk.areas.ThroneofDestruction) ? this.teleUsingCharges(node.x, node.y) : this.walkTo(node.x, node.y, (fail > 0 || me.inTown) ? 2 : 4)) {
				if (!me.inTown) {
					if (this.recursion) {
						this.recursion = false;

						// need to write a better clear function or change nodeaction
						settings.allowClearing && NodeAction.go({clearPath: true});

						if (getDistance(me, node.x, node.y) > 5) {
							this.moveToLoc(target, settings);
						}

						this.recursion = true;
					}

					settings.allowTown && Misc.townCheck();
				}
			} else {
				if (fail > 0 && !useTele && !me.inTown) {
					if (!cleared && settings.allowClearing) {
						Attack.clear(5) && Misc.openChests(2);
						cleared = true;
					}

					// Only do this once
					if (fail > 1 && me.getSkill(sdk.skills.LeapAttack, 1) && !leaped) {
						Skill.cast(sdk.skills.LeapAttack, 0, node.x, node.y);
						leaped = true;
					}
				}

				path = getPath(me.area, target.x, target.y, me.x, me.y, useTele ? 1 : 0, useTele ? rand(25, 35) : rand(10, 15));
				if (!path) { throw new Error("moveTo: Failed to generate path."); }

				fail += 1;
				path.reverse();
				PathDebug.drawPath(path);
				pop && path.pop();
				print("move retry " + fail);

				if (fail > 0) {
					settings.allowClearing && Attack.clear(5) && Misc.openChests(2);

					if (fail >= retry) {
						break;
					}
				}
			}
		}

		delay(5);
	}

	useTele && Config.TeleSwitch && me.switchWeapons(Attack.getPrimarySlot() ^ 1);
	PathDebug.removeHooks();

	return getDistance(me, node.x, node.y) < 5;
};

// Add check in case "random" to return false if bot doesn't have cold plains wp yet
Pather.useWaypoint = function useWaypoint(targetArea, check = false) {
	switch (targetArea) {
	case undefined:
		throw new Error("useWaypoint: Invalid targetArea parameter: " + targetArea);
	case null:
	case "random":
		check = true;

		break;
	default:
		if (typeof targetArea !== "number") {
			throw new Error("useWaypoint: Invalid targetArea parameter");
		}

		if (!this.wpAreas.includes(targetArea)) {
			throw new Error("useWaypoint: Invalid area");
		}

		break;
	}

	let tick, wp, coord, retry, npc;
	let once = false;

	for (let i = 0; i < 12; i += 1) {
		if (me.area === targetArea || me.dead) {
			break;
		}

		if (me.inTown) {
			npc = getUnit(sdk.unittype.NPC, NPC.Warriv);

			if (me.area === sdk.areas.LutGholein && npc && getDistance(me, npc) < 50) {
				if (npc && npc.openMenu()) {
					Misc.useMenu(sdk.menu.GoWest);

					if (!Misc.poll(function () {
						return me.area === sdk.areas.RogueEncampment;
					}, 2000, 100)) {
						throw new Error("Failed to go to act 1 using Warriv");
					}
				}
			}

			!getUIFlag(sdk.uiflags.Waypoint) && (!Skill.useTK(wp) || i > 1) && Town.move("waypoint");
		}

		wp = getUnit(sdk.unittype.Object, "waypoint");

		if (wp && wp.area === me.area) {
			if (Skill.useTK(wp) && i < 3 && !getUIFlag(sdk.uiflags.Waypoint)) {
				wp.distance > 21 && Pather.moveNearUnit(wp, 20);
				checkCollision(me, wp, 0x4) && Attack.getIntoPosition(wp, 20, 0x4);

				Skill.cast(sdk.skills.Telekinesis, 0, wp);
			} else if (!me.inTown && wp.distance > 7) {
				this.moveToUnit(wp);
			}

			if (check || Config.WaypointMenu) {
				if ((!Skill.useTK(wp) || i > 3) && (wp.distance > 5 || !getUIFlag(sdk.uiflags.Waypoint))) {
					this.moveToUnit(wp) && Misc.click(0, 0, wp);
				}

				!getUIFlag(sdk.uiflags.Waypoint) && Misc.click(0, 0, wp);

				tick = getTickCount();

				while (getTickCount() - tick < Math.max(Math.round((i + 1) * 1000 / (i / 5 + 1)), me.ping * 2)) {
					if (getUIFlag(sdk.uiflags.Waypoint)) {
						delay(500);

						switch (targetArea) {
						case "random":
							let retry = 0;

							while (true) {
								targetArea = this.wpAreas[rand(0, this.wpAreas.length - 1)];

								// get a valid wp, avoid towns
								if (!sdk.areas.Towns.includes(targetArea) && getWaypoint(this.wpAreas.indexOf(targetArea))) {
									break;
								}

								if (retry >= 10) {
									if (!getWaypoint(this.wpAreas.indexOf(sdk.areas.ColdPlains))) {
										me.cancel();
										me.overhead("Trying to get the waypoint");

										if (this.getWP(sdk.areas.ColdPlains)) {
											return true;
										}

										throw new Error("Pather.useWaypoint: Failed to go to waypoint " + targetArea);
									}
								}

								retry++;
								delay(5);
							}

							break;
						case null:
							me.cancel();

							return true;
						}

						if (!getWaypoint(this.wpAreas.indexOf(targetArea))) {
							me.cancel();
							me.overhead("Trying to get the waypoint");

							if (this.getWP(targetArea)) {
								return true;
							}

							throw new Error("Pather.useWaypoint: Failed to go to waypoint " + targetArea);
						}

						break;
					}

					delay(10);
				}

				if (!getUIFlag(sdk.uiflags.Waypoint)) {
					print("waypoint retry " + (i + 1));
					retry = Math.min(i + 1, 5);
					coord = CollMap.getRandCoordinate(me.x, -5 * retry, 5 * retry, me.y, -5 * retry, 5 * retry);
					this.moveTo(coord.x, coord.y);
					delay(200 + me.ping);
					Packet.flash(me.gid);
					wp && wp.distance > 5 && !getUIFlag(sdk.uiflags.Waypoint) && this.moveToUnit(wp);

					if (i === 10 && !once) {
						// wierd but when we can't click on anything npcs/portals/waypoint it seems that un-equipping an item then re-equipping it seems to fix it
						let _a = me.getItemsEx().filter(function (item) { return item.isEquipped; }).sort((a, b) => NTIP.GetTier(a) - NTIP.GetTier(b)).first();
						let bodLoc = _a ? _a.bodylocation : false;
						_a && bodLoc && _a.toCursor() && delay(200 + me.ping);
						me.itemoncursor && bodLoc && clickItemAndWait(0, bodLoc) && (once = true);
						once && console.debug("did this work?");
					}

					continue;
				}
			}

			if (!check || getUIFlag(sdk.uiflags.Waypoint)) {
				delay(200 + me.ping);
				wp.interact(targetArea);
				tick = getTickCount();

				while (getTickCount() - tick < Math.max(Math.round((i + 1) * 1000 / (i / 5 + 1)), me.ping * 4)) {
					if (me.area === targetArea) {
						delay(1000 + me.ping);
						return true;
					}

					delay(10 + me.ping);
				}

				while (!me.gameReady) {
					delay(500 + me.ping);
				}

				// In case lag causes the wp menu to stay open
				getUIFlag(sdk.uiflags.Waypoint) && me.cancel();
			}

			Packet.flash(me.gid);

			// Activate check if we fail direct interact twice
			if (i > 1) {
				check = true;
			}
		} else {
			Packet.flash(me.gid);
		}

		// We can't seem to get the wp maybe attempt portal to town instead and try to use that wp
		i >= 10 && !me.inTown && Town.goToTown();

		delay(200 + me.ping);
	}

	if (me.area === targetArea) {
		delay(200 + me.ping);
		return true;
	}

	throw new Error("useWaypoint: Failed to use waypoint to " + targetArea);
};

// credit - Legacy Autosmurf
Pather.clearToExit = function (currentarea, targetarea, cleartype = true) {
	let tick = getTickCount();
	print("ÿc8Kolbot-SoloPlayÿc0: Start clearToExit");
	print("Currently in: " + Pather.getAreaName(me.area));
	print("Currentarea arg: " + Pather.getAreaName(currentarea));

	me.area !== currentarea && Pather.journeyTo(currentarea);

	print("Clearing to: " + Pather.getAreaName(targetarea));

	while (me.area === currentarea) {
		try {
			Pather.moveToExit(targetarea, true, cleartype);
		} catch (e) {
			print("Caught Error: " + e);
		}

		Packet.flash(me.gid);
		delay(me.ping * 2 + 500);
	}

	print("ÿc8Kolbot-SoloPlayÿc0: End clearToExit. Time elapsed: " + Developer.formatTime(getTickCount() - tick));
};

Pather.getWalkDistance = function (x, y, area, xx, yy, reductionType, radius) {
	if (area === void 0) { area = me.area; }
    if (xx === void 0) { xx = me.x; }
    if (yy === void 0) { yy = me.y; }
    if (reductionType === void 0) { reductionType = 2; }
    if (radius === void 0) { radius = 5; }
    return (getPath(area, x, y, xx, yy, reductionType, radius) || [])
        // distance between node x and x-1
        .map(function (e, i, s) { return i && getDistance(s[i - 1], e) || 0; })
        .reduce(function (acc, cur) { return acc + cur; }, 0) || Infinity;
};
