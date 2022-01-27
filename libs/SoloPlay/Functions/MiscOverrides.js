/*
*	@filename	MiscOverrides.js
*	@author		theBGuy, isid0re
*	@desc		Misc.js fixes to improve functionality
*/

if (!isIncluded("common/Misc.js")) { include("common/Misc.js"); }
if (!isIncluded("SoloPlay/Tools/Developer.js")) { include("SoloPlay/Tools/Developer.js"); }

Misc.checkQuest = function (id, state) {
	sendPacket(1, 0x40);
	delay(500 + me.ping);
	return me.getQuest(id, state);
};

// updates config obj across all threads - from legacy sonic
Misc.updateConfig = function () {
	scriptBroadcast("config--" + JSON.stringify(Misc.copy(Config)));
};

Misc.townEnabled = true;

Misc.townCheck = function () {
	if (!Misc.townEnabled || !Town.canTpToTown()) return false;
	
	let potion, check,
		needhp = true,
		needmp = true;

	if (Config.TownCheck && !me.inTown) {
		try {
			if (me.charlvl > 2 && me.gold > 500) {
				for (let i = 0; i < 4; i += 1) {
					if (Config.BeltColumn[i] === "hp" && Config.MinColumn[i] > 0) {
						potion = me.getItem(-1, 2); // belt item

						if (potion) {
							do {
								if (potion.code.indexOf("hp") > -1) {
									needhp = false;

									break;
								}
							} while (potion.getNext());
						}

						if (needhp) {
							print("We need healing potions");

							check = true;
						}
					}

					if (Config.BeltColumn[i] === "mp" && Config.MinColumn[i] > 0) {
						potion = me.getItem(-1, 2); // belt item

						if (potion) {
							do {
								if (potion.code.indexOf("mp") > -1) {
									needmp = false;

									break;
								}
							} while (potion.getNext());
						}

						if (needmp) {
							print("We need mana potions");

							check = true;
						}
					}
				}
			}

			if (Config.OpenChests && Town.needKeys()) {
				check = true;
			}
		} catch (e) {
			check = false;
		}
	}

	if (check) {
		Messaging.sendToScript("libs/SoloPlay/Tools/TownChicken.js", "townCheck");
		print("BroadCasted townCheck");
		delay(500);

		return true;
	}

	return false;
};

Misc.openChest = function (unit) {
	// Skip invalid/open and Countess chests
	if (!unit || unit.x === 12526 || unit.x === 12565 || unit.mode) return false;

	// locked chest, no keys
	if (!me.assassin && unit.islocked && !me.findItem(543, 0, 3)) return false;

	for (let i = 0; i < 7; i++) {
		if (Skill.useTK(unit) && i < 3) {
			if (getDistance(me, unit) > 13) {
				Attack.getIntoPosition(unit, 13, 0x4);
			}
			
			Skill.cast(sdk.skills.Telekinesis, 0, unit);
		} else {
			if (Pather.moveTo(unit.x + 1, unit.y + 2, 3) && getDistance(me, unit.x + 1, unit.y + 2) < 5) {
				sendPacket(1, 0x13, 4, unit.type, 4, unit.gid);
			}
		}

		let tick = getTickCount();

		while (getTickCount() - tick < 1000) {
			if (unit.mode) return true;

			delay(10);
		}

		Packet.flash(me.gid);
	}

	if (!me.idle) {
		Misc.click(0, 0, me.x, me.y); // Click to stop walking in case we got stuck
	}

	return false;
};

Misc.openChests = function (range = 15) {
	let unit,
		unitList = [],
		containers = [
			"chest", "loose rock", "hidden stash", "loose boulder", "corpseonstick", "casket", "armorstand", "weaponrack",
			"holeanim", "roguecorpse", "corpse", "tomb2", "tomb3", "chest3",
			"skeleton", "guardcorpse", "sarcophagus", "object2", "cocoon", "hollow log", "hungskeleton",
			"bonechest", "woodchestl", "woodchestr",
			"burialchestr", "burialchestl", "chestl", "chestr", "groundtomb", "tomb3l", "tomb1l",
			"deadperson", "deadperson2", "groundtombl", "casket"
		],
		pita = ["barrel", "largeurn", "jar3", "jar2", "jar1", "urn", "jug"]; // pain in the ass

	if (Config.OpenChests === 2) {
		containers = [
			"chest", "loose rock", "hidden stash", "loose boulder", "corpseonstick", "casket", "armorstand", "weaponrack",
			"barrel", "holeanim", "tomb2", "tomb3", "roguecorpse", "ratnest", "corpse", "goo pile", "largeurn", "urn", "chest3",
			"jug", "skeleton", "guardcorpse", "sarcophagus", "object2", "cocoon", "basket", "stash", "hollow log", "hungskeleton",
			"pillar", "skullpile", "skull pile", "jar3", "jar2", "jar1", "bonechest", "woodchestl", "woodchestr", "barrel wilderness",
			"burialchestr", "burialchestl", "explodingchest", "chestl", "chestr", "groundtomb", "icecavejar1", "icecavejar2", "icecavejar3",
			"icecavejar4", "deadperson", "deadperson2", "evilurn", "tomb1l", "tomb3l", "groundtombl"
		];
	}

	unitList = getUnits(2).filter(function (chest) {
		return chest.name && chest.mode === 0 && chest.distance <= range &&
		(containers.includes(chest.name.toLowerCase()) || (chest.distance <= 2 && pita.includes(chest.name.toLowerCase()) && !Pather.useTeleport()) || (chest.name.toLowerCase() === "evilurn" && me.baal));
	});

	while (unitList.length > 0) {
		unitList.sort(Sort.units);
		unit = unitList.shift();

		if (unit && (Pather.useTeleport() || !checkCollision(me, unit, 0x4)) && this.openChest(unit)) {
			Pickit.pickItems();
		}
	}

	return true;
};

Misc.useWell = function (range = 15) {
	let unit, unitList = [];

	// I'm in perfect health, don't need this shit
	if (me.hpPercent >= 95 && me.mpPercent >= 95 && me.staminaPercent >= 95 && 
		[sdk.states.Frozen, sdk.states.Poison, sdk.states.AmplifyDamage, sdk.states.Decrepify].every(function (states) { return !me.getState(states); })) {
		return true;
	}

	unitList = getUnits(sdk.unittype.Object, "well").filter(function (well) {
		return well.distance < range && well.mode !== 2
	});

	while (unitList.length > 0) {
		unitList.sort(Sort.units);
		unit = unitList.shift();

		if (unit && (Pather.useTeleport() || !checkCollision(me, unit, 0x4))) {
			this.getWell(unit);
		}
	}

	return true;
};

Misc.getExpShrine = function (shrineLocs) {
	if (me.getState(137)) return true;

	for (let get = 0; get < shrineLocs.length; get++) {
		if (shrineLocs[get] === 2) {
			Pather.journeyTo(shrineLocs[get]);
		} else {
			if (!Pather.checkWP(shrineLocs[get])) {
				Pather.getWP(shrineLocs[get]);
			} else {
				Pather.useWaypoint(shrineLocs[get]);
			}
		}

		Precast.doPrecast(true);
		Misc.getShrinesInArea(shrineLocs[get], 15, true);

		if (me.getState(137)) {
			break;
		}

		!me.inTown && Town.goToTown();
	}

	return true;
};

Misc.getLightResShrine = function (shrineLocs) {
	if (me.getState(5) || me.lightRes >= 75) return true;

	let oldAttack = [];

	if (me.barbarian && me.normal && me.getSkill(133, 1) >= 6) {
		oldAttack = Config.AttackSkill.slice();
		Config.AttackSkill = [-1, 133, -1, 133, -1];
	}

	for (let get = 0; get < shrineLocs.length; get++) {
		if (shrineLocs[get] === 2) {
			Pather.journeyTo(shrineLocs[get]);
		} else {
			if (!Pather.checkWP(shrineLocs[get])) {
				Pather.getWP(shrineLocs[get]);
			} else {
				Pather.useWaypoint(shrineLocs[get]);
			}
		}

		Precast.doPrecast(true);
		Misc.getShrinesInArea(shrineLocs[get], 10, true);

		if (me.getState(5)) {
			Town.goToTown();
			break;
		}

		if (!me.inTown) {
			Town.goToTown();
		}
	}

	if (oldAttack.length > 0) {
		Config.AttackSkill = oldAttack.slice();
	}

	return true;
};

Misc.getGoodShrine = function (shrineLocs) {
	/* function checkState (shrineType) {
		let result = false;

		switch (shrineType) {
		case 6: // Armor
			if (me.getState(128) && !me.paladin) {
				result = true;
			}

			break;
		case 7: // Combat
			if (me.getState(129)) {
				result = true;
			}

			break;
		case 8: // Resist Fire
			if (me.getState(131) || Check.Resistance().FR >= 75) {
				result = true;
			}

			break;
		case 10: // Resist Light
			if (me.getState(131) || Check.Resistance().LR >= 75) {
				result = true;
			}

			break;
		case 12: // Skill
			if (me.getState(134)) {
				result = true;
			}

			break;
		case 15: // Exp
			if (me.getState(137)) {
				result = true;
			}

			break;
		}

		return result;
	} */

	let oldAttack = [];

	// Build shrine array
	let shrines = [];

	me.lightRes < 75 && shrines.push(10);	// Light Resist
	shrines.push(12);	// Skill
	(me.barbarian || me.amazon) && shrines.push(7);	// Combat
	!me.paladin && shrines.push(6);	// Armor (paladin has holy shield, this would be unnecessary)

	if (me.barbarian && me.normal && me.getSkill(133, 1) >= 6) {
		oldAttack = Config.AttackSkill.slice();
		Config.AttackSkill = [-1, 133, -1, 133, -1];
	}

	for (let get = 0; get < shrineLocs.length; get++) {
		if (shrineLocs[get] === 2) {
			Pather.journeyTo(shrineLocs[get]);
		} else {
			if (!Pather.checkWP(shrineLocs[get])) {
				Pather.getWP(shrineLocs[get]);
			} else {
				Pather.useWaypoint(shrineLocs[get]);
			}
		}

		Precast.doPrecast(true);

		if (Misc.getGoodShrinesInArea(shrineLocs[get], shrines, true)) {
			Town.goToTown();

			break;
		}
		
		/*if (checkState(shrineToLookFor)) {
			Town.goToTown();
			break;
		}*/

		if (!me.inTown) {
			Town.goToTown();
		}
	}

	if (oldAttack.length > 0) {
		Config.AttackSkill = oldAttack.slice();
	}

	return true;
};

Misc.getGoodShrinesInArea = function (area, types, use) {
	let coords, shrine,
		shrineLocs = [],
		shrineIds = [2, 81, 83],
		unit = getPresetUnits(area);

	if (unit) {
		for (let i = 0; i < unit.length; i += 1) {
			if (shrineIds.indexOf(unit[i].id) > -1) {
				shrineLocs.push([unit[i].roomx * 5 + unit[i].x, unit[i].roomy * 5 + unit[i].y]);
			}
		}
	}

	while (shrineLocs.length > 0) {
		shrineLocs.sort(Sort.points);
		coords = shrineLocs.shift();
		Pather.moveTo(coords[0], coords[1], 2);
		shrine = getUnit(2, "shrine");

		if (shrine) {
			do {
				if (types.indexOf(shrine.objtype) > -1 && shrine.mode === 0) {
					Pather.moveTo(shrine.x - 2, shrine.y - 2);

					if (!use || this.getShrine(shrine)) {
						me.overhead("Got shrine type: " + shrine.objtype);
						return true;
					}
				}
			} while (shrine.getNext());
		}
	}

	return false;
};

// Add use of tk for shrine - from autoplay
Misc.getShrine = function (unit = undefined) {
	if (!unit || unit.mode) return false;

	for (let i = 0; i < 3; i++) {
		if (Skill.useTK(unit) && i < 2) {
			if (getDistance(me, unit) > 13) {
				Attack.getIntoPosition(unit, 13, 0x4 );
			}
			
			Skill.cast(sdk.skills.Telekinesis, 0, unit);
		} else {
			if (getDistance(me, unit) < 4 || Pather.moveToUnit(unit, 3, 0)) {
				Misc.click(0, 0, unit);
			}
		}

		let tick = getTickCount();

		while (getTickCount() - tick < 1000) {
			if (unit.mode) return true;

			delay(10);
		}
	}

	return false;
};

Misc.getWell = function (unit) {
	if (unit.mode === 2) return false;

	for (let i = 0; i < 3; i += 1) {
		if (Skill.useTK(unit) && i < 2) {
			if (getDistance(me, unit) > 13) {
				Attack.getIntoPosition(unit, 13, 0x4);
			}
			
			Skill.cast(sdk.skills.Telekinesis, 0, unit);
		} else {
			if (getDistance(me, unit) < 4 || Pather.moveToUnit(unit, 3, 0)) {
				Misc.click(0, 0, unit);
			}
		}

		let tick = getTickCount();

		while (getTickCount() - tick < 1000) {
			if (unit.mode !== 0) return true;

			delay(10);
		}
	}

	return false;
};

Misc.checkItemsForSocketing = function () {
	if (me.classic || !me.getQuest(sdk.quests.SiegeOnHarrogath, 1)) return false;

	let items = me.getItemsEx()
		.filter(item => item.getStat(sdk.stats.NumSockets) === 0 && getBaseStat("items", item.classid, "gemsockets") > 0)
		.sort((a, b) => NTIP.GetTier(b) - NTIP.GetTier(a));

	for (let i = 0; i < items.length; i++) {
		let curr = Config.socketables.find(({ classid }) => items[i].classid === classid);
		if (curr && curr.condition(items[i]) && curr.useSocketQuest) {
			return items[i];
		}
	}

	return false;
};

Misc.checkItemsForImbueing = function () {
	if (!me.getQuest(sdk.quests.ToolsoftheTrade, 1)) return false;

	let item = false;
	let items = me.getItems()
		.filter(item => item.getStat(sdk.stats.NumSockets) === 0 && [sdk.itemquality.Normal, sdk.itemquality.Superior].includes(item.quality));

	for (let i = 0; i < items.length; i++) {
		if (Config.imbueables.some(function (item) { return item.name === items[i].classid && Item.canEquip(items[i]); })) {
			return items[i];
		}
	}

	return false;
};

Misc.addSocketables = function (item, itemInfo) {
	if (!item) return false;
	let multiple = [];
	let ready = false;
	let sockets = item.getStat(sdk.stats.NumSockets);
	let socketables = me.getItemsEx()
		.filter(item => [sdk.itemtype.Jewel, sdk.itemtype.Rune].includes(item.itemType) || (item.itemType >= sdk.itemtype.Amethyst && item.itemType <= sdk.itemtype.Skull));

	if (!socketables) return false;

	function highestGemAvailable (gem, checkList = []) {
		if (!gem) return false;

		// filter out all items that aren't the gem type we are looking for
		// then sort the highest classid (better gems first)
		let myItems = me.getItemsEx()
			.filter(item => item.itemType === gem.itemType)
			.sort((a, b) => b.classid - a.classid);

		for (let i = 0; i < myItems.length; i++) {
			if (!checkList.includes(myItems[i])) {
				return true;
			}
		}

		return false;
	}

	for (let i = 0; i < socketables.length; i++) {
		if (!!itemInfo && !!itemInfo.socketWith) {
			if (itemInfo.socketWith.includes(socketables[i].classid) && !multiple.includes(socketables[i])) {
				if (multiple.length < sockets) {
					multiple.push(socketables[i]);
				}
			}
		} else {
			let itemtype = item.getItemType();
			if (!itemtype) continue;
			let gemType = ["Helmet", "Armor"].includes(itemtype) ? "Ruby" : itemtype === "Shield" ? "Diamond" : itemtype === "Weapon" && !Check.currentBuild().caster ? "Skull" : "";
			let runeType;

			// Tir rune in normal, Io rune otherwise and Shael's if assassin
			!gemType && (runeType = me.normal ? "Tir" : me.assassin ? "Shael" : "Io");

			// If itemtype was matched with a gemType
			if (gemType) {
				// current item matches wanted gemType
				if (socketables[i].itemType === sdk.itemtype[gemType]) {
					// is the highest gem of that type
					if (highestGemAvailable(socketables[i], multiple)) {
						if (multiple.length < sockets) {
							multiple.push(socketables[i]);
						}
					}
				}
			} else if (runeType) {
				if (socketables[i].classid === sdk.items.runes[runeType] && !multiple.includes(socketables[i])) {
					if (multiple.length < sockets) {
						multiple.push(socketables[i]);
					}
				}
			}
		}

		if (multiple.length === sockets) {
			ready = true;
			break;
		}
	}
	
	if (multiple.length > 0 && ready) {
		// check to ensure I am a high enough level to use wanted socketables
		for (let i = 0; i < multiple.length; i++) {
			if (me.charlvl < multiple[i].lvlreq) {
				print("ÿc8Kolbot-SoloPlayÿc0: Not high enough level for " + multiple[i].fname);
				return false;
			}
		}

		for (let i = 0; i < multiple.length; i++) {
			if (Misc.addSocketableToItem(item, multiple[i])) {
				D2Bot.printToConsole("Added socketable: " + multiple[i].fname + " to " + item.fname, 6);
				delay(250 + me.ping);
			} else {
				print("ÿc8Kolbot-SoloPlayÿc0: Failed to add socketable to " + item.fname);
			}
		}

		return item.getItemsEx().length === sockets;
	}

	return false;
};

Misc.checkSocketables = function () {
	let items = me.getItemsEx()
		.filter(item => item.getStat(sdk.stats.NumSockets) > 0 && NTIP.GetTier(item) > 0 && !item.isRuneword)
		.sort((a, b) => NTIP.GetTier(b) - NTIP.GetTier(a));

	if (!items) return;

	for (let i = 0; i < items.length; i++) {
		let sockets = items[i].getStat(sdk.stats.NumSockets);

		// no need to check anything else if already socketed
		// TODO: check if item is socketed with what we want instead
		// I.E we have a double p-gemmed mosers but want to double um it
		if (!!items[i].getItem()) {
			continue;
		}

		switch (items[i].quality) {
		case sdk.itemquality.Magic:
		case sdk.itemquality.Rare:
		case sdk.itemquality.Crafted:
			// Any magic, rare, or crafted item with open sockets
			if (items[i].isEquipped && [1, 3, 4, 5].includes(items[i].bodylocation) && sockets >= 1) {
				Misc.addSocketables(items[i]);
			}

			break;
		case sdk.itemquality.Set:
		case sdk.itemquality.Unique:
			{
				let curr = Config.socketables.find(({ classid }) => items[i].classid === classid);

				if (curr && curr.condition(items[i])) {
					Misc.addSocketables(items[i], curr);
				} else if (items[i].isEquipped) {
					Misc.addSocketables(items[i]);
				}
			}

			break;
		default:
			break;
		}
	}
};

Misc.addSocketableToItem = function (item, rune) {
	if (item.getStat(sdk.stats.NumSockets) === 0) return false;

	if (item.mode === sdk.itemmode.Equipped) {
		let bodyLoc = item.bodylocation;

		// No space to get the item back
		if (!Storage.Inventory.CanFit(item)) {
			print("ÿc8AddSocketableToItemÿc0 :: No space to get item back");
			return false;
		} else {
			item.isInStash && Town.openStash();
			if (!Storage.Inventory.MoveTo(item)) return false;
		}

		if (!rune.toCursor()) return false;

		for (let i = 0; i < 3; i += 1) {
			sendPacket(1, 0x28, 4, rune.gid, 4, item.gid);
			let tick = getTickCount();

			while (getTickCount() - tick < 2000) {
				if (!me.itemoncursor) {
					delay(300);

					break;
				}

				delay(10);
			}

			if (item.getItem()) {
				Misc.logItem("Added " + rune.name + " to: ", item);
				bodyLoc && Item.equip(item, bodyLoc);

				return true;
			}
		}

		return false;
	} else {
		if (Runewords.socketItem(item, rune)) {
			Misc.logItem("Added " + rune.name + " to: ", item);
			return true;
		}	
	}

	return false;
};

// Log kept item stats in the manager.
Misc.logItem = function (action, unit, keptLine) {
	if (!this.useItemLog || unit === undefined || !unit) return false;

	// Don't check for config settings if there's no config loaded	
	if (Config.loaded) {
		if (!Config.LogKeys && ["pk1", "pk2", "pk3"].indexOf(unit.code) > -1) {
			return false;
		}

		if (!Config.LogOrgans && ["dhn", "bey", "mbr"].indexOf(unit.code) > -1) {
			return false;
		}

		if (!Config.LogLowRunes && ["r01", "r02", "r03", "r04", "r05", "r06", "r07", "r08", "r09", "r10", "r11", "r12", "r13", "r14"].indexOf(unit.code) > -1) {
			return false;
		}

		if (!Config.LogMiddleRunes && ["r15", "r16", "r17", "r18", "r19", "r20", "r21", "r22", "r23"].indexOf(unit.code) > -1) {
			return false;
		}

		if (!Config.LogHighRunes && ["r24", "r25", "r26", "r27", "r28", "r29", "r30", "r31", "r32", "r33"].indexOf(unit.code) > -1) {
			return false;
		}

		if (!Config.LogLowGems && ["gcv", "gcy", "gcb", "gcg", "gcr", "gcw", "skc", "gfv", "gfy", "gfb", "gfg", "gfr", "gfw", "skf", "gsv", "gsy", "gsb", "gsg", "gsr", "gsw", "sku"].indexOf(unit.code) > -1) {
			return false;
		}

		if (!Config.LogHighGems && ["gzv", "gly", "glb", "glg", "glr", "glw", "skl", "gpv", "gpy", "gpb", "gpg", "gpr", "gpw", "skz"].indexOf(unit.code) > -1) {
			return false;
		}

		for (let i = 0; i < Config.SkipLogging.length; i++) {
			if (Config.SkipLogging[i] === unit.classid || Config.SkipLogging[i] === unit.code) {
				return false;
			}
		}
	}

	if (!unit.fname) return false;

	let lastArea, code, desc, sock, itemObj,
		color = -1,
		name = unit.fname.split("\n").reverse().join(" ").replace(/ÿc[0-9!"+<:;.*]|\/|\\/g, "").trim();

	desc = this.getItemDesc(unit);
	color = unit.getColor();

	if (action.match("kept", "i")) {
		lastArea = DataFile.getStats().lastArea;
		lastArea && (desc += ("\n\\xffc0Area: " + lastArea));
	}

	let mercCheck = action.match("Merc");

	if (!action.match("kept", "i") && !action.match("Shopped") && AutoEquip.hasTier(unit)) {
		if (!mercCheck) {
			NTIP.GetCharmTier(unit) > 0 && (desc += ("\n\\xffc0Autoequip charm tier: " + NTIP.GetCharmTier(unit)));
			NTIP.GetTier(unit) > 0 && (desc += ("\n\\xffc0Autoequip char tier: " + NTIP.GetTier(unit)));
		} else {
			desc += ("\n\\xffc0Autoequip merc tier: " + NTIP.GetMercTier(unit));
		}
	}

	if (unit.getFlag(0x10)) {
		switch (unit.quality) {
		case 5: // Set
			switch (unit.classid) {
			case 27: // Angelic sabre
				code = "inv9sbu";

				break;
			case 74: // Arctic short war bow
				code = "invswbu";

				break;
			case 308: // Berserker's helm
				code = "invhlmu";

				break;
			case 330: // Civerb's large shield
				code = "invlrgu";

				break;
			case 31: // Cleglaw's long sword
			case 227: // Szabi's cryptic sword
				code = "invlsdu";

				break;
			case 329: // Cleglaw's small shield
				code = "invsmlu";

				break;
			case 328: // Hsaru's buckler
				code = "invbucu";

				break;
			case 306: // Infernal cap / Sander's cap
				code = "invcapu";

				break;
			case 30: // Isenhart's broad sword
				code = "invbsdu";

				break;
			case 309: // Isenhart's full helm
				code = "invfhlu";

				break;
			case 333: // Isenhart's gothic shield
				code = "invgtsu";

				break;
			case 326: // Milabrega's ancient armor
			case 442: // Immortal King's sacred armor
				code = "invaaru";

				break;
			case 331: // Milabrega's kite shield
				code = "invkitu";

				break;
			case 332: // Sigon's tower shield
				code = "invtowu";

				break;
			case 325: // Tancred's full plate mail
				code = "invfulu";

				break;
			case 3: // Tancred's military pick
				code = "invmpiu";

				break;
			case 113: // Aldur's jagged star
				code = "invmstu";

				break;
			case 234: // Bul-Kathos' colossus blade
				code = "invgsdu";

				break;
			case 372: // Grizwold's ornate plate
				code = "invxaru";

				break;
			case 366: // Heaven's cuirass
			case 215: // Heaven's reinforced mace
			case 449: // Heaven's ward
			case 426: // Heaven's spired helm
				code = "inv" + unit.code + "s";

				break;
			case 357: // Hwanin's grand crown
				code = "invxrnu";

				break;
			case 195: // Nalya's scissors suwayyah
				code = "invskru";

				break;
			case 395: // Nalya's grim helm
			case 465: // Trang-Oul's bone visage
				code = "invbhmu";

				break;
			case 261: // Naj's elder staff
				code = "invcstu";

				break;
			case 375: // Orphan's round shield
				code = "invxmlu";

				break;
			case 12: // Sander's bone wand
				code = "invbwnu";

				break;
			}

			break;
		case 7: // Unique
			for (let i = 0; i < 401; i += 1) {
				if (unit.code === getBaseStat(17, i, 4).trim() && unit.fname.split("\n").reverse()[0].indexOf(getLocaleString(getBaseStat(17, i, 2))) > -1) {
					code = getBaseStat(17, i, "invfile");

					break;
				}
			}

			break;
		}
	}

	if (!code) {
		// Tiara/Diadem
		code = ["ci2", "ci3"].indexOf(unit.code) > -1 ? unit.code : getBaseStat(0, unit.classid, 'normcode') || unit.code;
		code = code.replace(" ", "");

		if ([10, 12, 58, 82, 83, 84].indexOf(unit.itemType) > -1) {
			code += (unit.gfx + 1);
		}
	}

	sock = unit.getItem();

	if (sock) {
		do {
			if (sock.itemType === 58) {
				desc += "\n\n";
				desc += this.getItemDesc(sock);
			}
		} while (sock.getNext());
	}

	keptLine && (desc += ("\n\\xffc0Line: " + keptLine));
	desc += "$" + (unit.getFlag(0x400000) ? ":eth" : "");

	itemObj = {
		title: action + " " + name,
		description: desc,
		image: code,
		textColor: unit.quality,
		itemColor: color,
		header: "",
		sockets: this.getItemSockets(unit)
	};

	D2Bot.printToItemLog(itemObj);

	return true;
};

Misc.shapeShift = function (mode) {
	let skill, state;

	switch (mode.toString().toLowerCase()) {
	case "0":
		return false;
	case "1":
	case "werewolf":
		state = 139;
		skill = 223;

		break;
	case "2":
	case "werebear":
		state = 140;
		skill = 228;

		break;
	default:
		throw new Error("shapeShift: Invalid parameter");
	}

	if (me.getState(state)) return true;

	let slot = me.weaponswitch;
	me.switchWeapons(Precast.getBetterSlot(skill));

	for (let i = 0; i < 3; i += 1) {
		Skill.cast(skill, 0);
		let tick = getTickCount();

		while (getTickCount() - tick < 2000) {
			if (me.getState(state)) {
				delay(250);
				me.weaponswitch !== slot && me.switchWeapons(0);

				return true;
			}

			delay(10);
		}
	}

	me.weaponswitch !== slot && me.switchWeapons(0);

	return false;
};

Misc.buyItem = function (unit, shiftBuy, gamble) {
	let oldGold = me.gold,
		itemCount = me.itemcount,
		npc = getInteractedNPC();

	if (!npc) {
		print("buyItem: No NPC menu open.");
		return false;
	}

	// Can we afford the item?
	if (me.gold < unit.getItemCost(0)) return false;

	for (let i = 0; i < 3; i += 1) {
		sendPacket(1, 0x32, 4, npc.gid, 4, unit.gid, 4, shiftBuy ? 0x80000000 : gamble ? 0x2 : 0x0, 4, 0);
		let tick = getTickCount();

		while (getTickCount() - tick < Math.max(2000, me.ping * 2 + 500)) {
			if (shiftBuy && me.gold < oldGold) return true;
			if (itemCount !== me.itemcount) return true;

			delay(10);
		}
	}

	return false;
};

Misc.errorReport = function (error, script) {
	var i, date, dateString, msg, oogmsg, filemsg, source, stack,
		stackLog = "";

	date = new Date();
	dateString = "[" + new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0,-5).replace(/-/g, '/').replace('T', ' ') + "]";

	if (typeof error === "string") {
		msg = error;
		oogmsg = error.replace(/ÿc[0-9!"+<:;.*]/gi, "");
		filemsg = dateString + " <" + me.profile + "> " + error.replace(/ÿc[0-9!"+<:;.*]/gi, "") + "\n";
	} else {
		source = error.fileName.substring(error.fileName.lastIndexOf("\\") + 1, error.fileName.length);
		msg = "ÿc1Error in ÿc0" + script + " ÿc1(" + source + " line ÿc1" + error.lineNumber + "): ÿc1" + error.message;
		oogmsg = " Error in " + script + " (" + source + " #" + error.lineNumber + ") " + error.message + " (Area: " + Pather.getAreaName(me.area) + ", Ping:" + me.ping + ", Game: " + me.gamename + ")";
		filemsg = dateString + " <" + me.profile + "> " + msg.replace(/ÿc[0-9!"+<:;.*]/gi, "") + "\n";

		if (error.hasOwnProperty("stack")) {
			stack = error.stack;

			if (stack) {
				stack = stack.split("\n");

				if (stack && typeof stack === "object") {
					stack.reverse();
				}

				for (i = 0; i < stack.length; i += 1) {
					if (stack[i]) {
						stackLog += stack[i].substr(0, stack[i].indexOf("@") + 1) + stack[i].substr(stack[i].lastIndexOf("\\") + 1, stack[i].length - 1);

						if (i < stack.length - 1) {
							stackLog += ", ";
						}
					}
				}
			}
		}

		if (stackLog) {
			filemsg += "Stack: " + stackLog + "\n";
		}
	}

	if (this.errorConsolePrint) {
		D2Bot.printToConsole(oogmsg, 10);
	}

	showConsole();
	print(msg);
	this.fileAction("logs/ScriptErrorLog.txt", 2, filemsg);
	takeScreenshot();
	delay(500);
};

// singleplayer delay(0) fix
Packet.openMenu = function (unit) {
	if (unit.type !== 1) { throw new Error("openMenu: Must be used on NPCs."); }
	if (getUIFlag(sdk.uiflags.NPCMenu)) return true;

	for (let i = 0; i < 5; i += 1) {
		unit.distance > 4 && Pather.moveToUnit(unit);
		sendPacket(1, 0x13, 4, 1, 4, unit.gid);
		let tick = getTickCount();

		while (getTickCount() - tick < 5000) {
			if (getUIFlag(sdk.uiflags.NPCMenu)) {
				delay(Math.max(500, me.ping * 2));

				return true;
			}

			if (getInteractedNPC() && getTickCount() - tick > 1000) {
				me.cancel();
			}

			delay(100);
		}

		sendPacket(1, 0x2f, 4, 1, 4, unit.gid);
		delay(me.ping * 2 + 1);
		sendPacket(1, 0x30, 4, 1, 4, unit.gid);
		delay(me.ping * 2 + 1);
		this.flash(me.gid);
	}

	return false;
};
