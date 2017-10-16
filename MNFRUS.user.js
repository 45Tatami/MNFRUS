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

// Add names you want to filter
var filterList = ["Like this", "or this"];

// Set to true if you want to hide the delete counter
var hideFilterCount = false;

// Set to true if you want posts to be completely invisible
var invisibleDelete =  false;

// Set to false to disable chain filtering
var chainFiltering = true;

// ================== MEMBERS ================== 

var deletedPostCount = 0;
var removedCountElement;
var threadContainer = document.getElementById("thread-container");
var newPostObserver = null;
var obsAttrConfig = { attributes: true, attributeFilter: [ "class" ]};
var postList;

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
			checkForRemovalByReplies(getPostFromDOMObject(mutation.target));
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
	
	// get Name
	var postName = post.name;
	
	// Go through list of filters, remove and break on match
	for (var filterName of filterList) {
		if (filterName == postName) {
			removePost(post);
			break;
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
			let parent;
			if (p[1] == post.op)
				parent = postList.get(p[0]);
			else
				parent = postList.getFromAll(p[0]);
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
	if (invisibleDelete) {
		post.remove()
	} else {
		post.setDeleted();
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

function isFiltered(post) {
	if (post == null)
		return invisibleDelete;

	if (invisibleDelete)
		return !postList.has(post.id);
	else
		return post.deleted;
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
	}
	if (chainFiltering) {		
		for (let post of postList) {
			checkForRemovalByReplies(post);
		}
	}
	
	// Using DOM to get notified on new posts; Can't find a good way to use the Meguca API
	newPostObserver	= new MutationObserver(postCreationHandler);
	newPostObserver.observe(threadContainer, { childList: true });
};
var finLoadingObserver = new MutationObserver(finLoadingHandler);
finLoadingObserver.observe(document.getElementById('loading-image'), {attributes: true});
