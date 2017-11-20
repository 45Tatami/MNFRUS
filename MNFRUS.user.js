// ==UserScript==
// @name		MNFRUS
// @namespace	gucaguca
// @description Meguca NameFag Removal UserScript
// @include		https://meguca.org/*
// @version		1.2
// @grant		none 
// @run-at		document-end
// ==/UserScript==

// ================== CONFIG ==================

// ------------------ FILTER ------------------

// Add names you want to filter
var nameFilterList = ["Like this", "or this"];

// Add trips you want to filter
var tripFilterList = ["Like this", "or this"];

// Add text you want to filter, just like the other filter lists
var textFilterList = [];

// Add SHA1 hashes (hex format) you want to filter.
var fileFilterList = [];

// ------------------ OTHER OPTIONS ------------------

// Set to true if you want to hide the delete counter
var hideFilterCount = false;

// Set to true if you want posts to be completely invisible
var invisibleDelete =  false;

// Set to false to disable chain filtering
var chainFiltering = true;

// Tries to fix e.g. "@" or ">" in replies (If your browser hangs, disable this)
// Breaks hashtag commands on fixed posts
var fixDeniedReplies = true;

// Marks links to deleted posts with a strikethrough
var markDeletedPostLinks = true;

// ================== MEMBERS ================== 

var deletedPostCount = 0;
var removedCountElement;
var threadContainer = document.getElementById("thread-container");
var newPostObserver = null;
var obsAttrConfig = { attributes: true};
var postList;
var regExps;
var postLinks = threadContainer.getElementsByClassName("post-link");
var linkColor;

// ================== FUNCTIONS ==================

function postCreationHandler(mutationRecords) {
	mutationRecords.forEach(function(mutation) {
		if (mutation.type == "childList") {
			for (let p of mutation.addedNodes) {
				let post = getPostFromDOMObject(p);
				checkForRemovalByName(post);
				if (chainFiltering && !isFiltered(post) && post.editing) {
					newPostObserver.observe(p, obsAttrConfig);
				}
			}
		} else if (mutation.type == "attributes") {
			let post = getPostFromDOMObject(mutation.target);
			if (!post.editing && fixDeniedReplies) {
				repairReply(post);
			}
			checkForRemovalByReplies(post);
		} else {
			console.log("Unhandled mutation type " + mutation.type);
		}
	});
}

function checkForRemoval(post) {
	checkForRemovalByName(post);
	checkForRemovalByReplies(post);
}

// Checks if a post needs to be removed and removes it.
// If chainfiltering is on, recurses through replies.
function checkForRemovalByName(post) {
	if (isFiltered(post))
		return;
	
	// Names
	let nameP = post.name;
	if (nameP !== "Anonymous" && typeof nameP !== "undefined") {
		for (let name of nameFilterList) {
			if (name === nameP) {
				console.log("Deleting post No. " + post.id + " because name");
				removePost(post);
				return;
			}
		}
	}

	// Trips
	let tripP = post.trip;
	if (typeof tripP !== "undefined") { // this is fucking bullshit
		for (let trip of tripFilterList) {
			if (trip === tripP) {
				console.log("Deleting post No. " + post.id + " because trip");
				removePost(post)
				return;
			}
		}
	}

	// Text
	let textP = post.body;
	for (let text of textFilterList) {
		if (textP.includes(text)) {
			console.log("Deleting post No. " + post.id + " because name");
			removePost(post);
			return;
		}
	}

	// Images
	let hashP = post.Image.SHA1;
	for (let hash of fileFilterList) {
		if (hashP === hash) {
			console.log("Deleting post No. " + post.id + " because hash");
			removePost(post);
			return;
		}
	}
}

function checkForRemovalByReplies(post) {
	if (post == null || isFiltered(post))
		return;
	
	let parents = getParents(post);
	if (parents.length > 0) {
		let shitpost = true;
		for (let p of parents) {
			// TODO replies outside of thread
			let parent = postList.get(p[0]);
			if (!isFiltered(parent)) {
				shitpost = false;
				break;
			}
		}
		if (shitpost) {
			removePost(post);
		}
	}
}

function removePost(post)  {
	console.log("Deleted: " + post.id);
	if (invisibleDelete) {
		post.hide()
	} else {
		post.setDeleted();
	}

	if (markDeletedPostLinks) {
		let id = post.id;
		for (let postLink of postLinks) {
			if (postLink.getAttribute("data-id") == id) {
				// This is incredible ugly but normal strikethrough gets overriden by css and the element doesn't contain the color
				let strike = document.createElement('s');
				if (linkColor == null)
					linkColor = window.getComputedStyle(postLink, null).getPropertyValue("color");
				strike.style.color = linkColor;
				postLink.parentNode.insertBefore(strike, postLink);
				strike.appendChild(postLink);
			}
		}
	}
	
	// Increase and update filter count
	if (!hideFilterCount) {
		deletedPostCount++;
		updateRemovedCounter();
	}
}

function getParents(post) {
	let parents = post.links;
	if (parents == null)
		return []
	return parents;
}

function getPostFromDOMObject(p) {
	return postList.get(p.getAttribute('id').slice(1));
}

function getDOMObjectFromPost(post) {
	return document.getElementById("p" + post.id);
}

function isFiltered(post) {
	if (post == null)
		return false;

	if (invisibleDelete)
		return post.hidden;
	else
		return post.deleted;
}

function repairReply(post) {
	// TODO double backlink to some deleted posts
	// Don't create new expressions for every post, create for the first and reuse
	if (regExps == null) {
		// TODO Wrong behaviour on threads with digit change
		let digits = post.id.toString().length;
		let regID = '([0-9]{' + digits + '})(?![0-9])';
		regExps = [
			new RegExp('^(>)' + regID, 'gm'),
			new RegExp('^(@)' + regID, 'gm'),
			new RegExp('^()'  + regID, 'gm')
		];
	}
	
	// Check for each each kind of regular expression defined beforehand
	let changed = false;
	for (let reg of regExps) {
		let replies;
		// Search post until none are found
		while ((replies = reg.exec(post.body)) !== null) {
			post.body = post.body.replace(reg, ">>" + replies[2] + " (Fixed)");
			// Modify regex position after replacing
			reg.lastIndex = reg.lastIndex + 2 - replies[1].length;
			if (post.links == null)
				post.links = [];
			post.links.push([replies[2], post.op]);
			changed = true;
		}
	}

	// Reparse post if we changed something
	if (changed) {
		post.editing = true;
		// Breaks # commands when editing, doesn't work when not editing
		// TODO maybe create links manually
		post.view.reparseBody(); 
		post.propagateLinks();
		post.editing = false;
	}
}

function createRemovedCounter() {
	var removedCountContent = document.createTextNode(deletedPostCount);
	removedCountElement = document.createElement("b");
	removedCountElement.setAttribute("class", "act hide-empty banner-float");
	removedCountElement.setAttribute("title", "Removed Posts");
	removedCountElement.appendChild(removedCountContent);
	document.getElementById("banner").insertBefore(removedCountElement, document.getElementById("thread-post-counters"));
}

function updateRemovedCounter() {
	removedCountElement.innerHTML = deletedPostCount;
}

// ================== SCRIPT ==================


// Create Filtered Counter on top
if (!hideFilterCount)
	createRemovedCounter();

// Wait for Meguca to finish loading
var finLoadingHandler = function(e) { 
	// Get all old posts and check for removal
	postList = window.require("state").posts;
	for (let post of postList) {
		checkForRemovalByName(post);
		if (fixDeniedReplies) {
			repairReply(post);
		}
	}
	if (chainFiltering) {		
		for (let post of postList) {
			checkForRemovalByReplies(post);
		}
	}
	
	// Using DOM to get notified on new posts; Can't find a good way to use the Meguca API
	newPostObserver = new MutationObserver(postCreationHandler);
	newPostObserver.observe(threadContainer, { childList: true });
	console.log("Init Done");
};
var finLoadingObserver = new MutationObserver(finLoadingHandler);
finLoadingObserver.observe(document.getElementById('loading-image'), {attributes: true});
