// ==UserScript==
// @name        MNFRUS
// @namespace   gucaguca
// @description Meguca NameFag Removal UserScript
// @include     https://meguca.org/*
// @version     1.2
// @grant       none
// @run-at      document-end
// ==/UserScript==

// ================== CONFIG ==================

// Add names you want to filter
var filterList = ["Like this", "or this"];

// Set to true if you want to hide the delete counter
var hideFilterCount = false;

// Set to true if you want posts to be completely invisible
var invisibleDelete = false;

// Set to false to disable chain filtering
var chainFiltering = true;

// ================== MEMBERS ================== 

var deletedPostCount = 0;
var removedCountElement;
var threadContainer = document.getElementById("thread-container");
var opPost;
var REMOVED = " mnfrus_filtered";
var newPostObserver = null;
var obsAttrConfig = { attributes: true, attributFilter: [ "class" ]};

// ================== FUNCTIONS ==================

function postCreationHandler(mutationRecords) {
  mutationRecords.forEach(function(mutation) {
    if (mutation.type == "childList") {
      for (var post of mutation.addedNodes) {
        checkForRemovalByName(post);
        if (!isFiltered(post) && post.className.includes("editing")) {
          newPostObserver.observe(post, obsAttrConfig);
        }
      }
    } else if (mutation.type = "attributes") {
      checkForRemovalByReplies(mutation.target);
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
  // Abort if already filtered or not a post
  if (post == null || isFiltered(post))
    return;
  
  // get Name
  var postName = getPostName(post);
  
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
  
  var parents = getParents(post);
  if (parents.length > 0) {
    var shitpost = true;
    for (var p of parents) {
      if (!isFiltered(p)) {
        shitpost = false;
        break;
      }
    }
    if (shitpost) {
      removePost(post);
      return;
    }
  }
}

function removePost(post)  {
  if (invisibleDelete) {
    var oldAttr = post.getAttribute("style");
    if (oldAttr == null)
      oldAttr = "";
    post.setAttribute("style", oldAttr + "display: none;");
  } else {
    if (!post.className.includes("deleted"))
      post.className += " deleted";
  }
  
  // Mark as custom filtered class for convenience
  post.className += REMOVED;
     
  // Increase and update filter count
  deletedPostCount++;
  updateRemovedCounter();
}

function getPostName(post) {
  // Need to search by class because children of the post seem to differ between observer and manual call
  return post.childNodes[1].getElementsByClassName("name")[0].childNodes[0].innerHTML;
}

function getReplies(post) {
  //var backlinks = Array.prototype.slice.call(post.childNodes[post.childNodes.length - 1].getElementsByClassName("post-link"));
  var backLinkSpan = post.getElementsByClassName("backlinks");
  if (backLinkSpan == null || backLinkSpan.length == 0)
    return [];
  var backlinks = Array.prototype.slice.call(backLinkSpan[0].getElementsByClassName("post-link"));
  
  // Replace backlink elements with real posts
  for (var i = 0; i < backlinks.length; i++) {
    backlinks[i] = getPostWithID(backlinks[i].getAttribute("data-id"))
  }
  
  return backlinks;
}

function getParents(post) {
  var postContainer = post.getElementsByClassName("post-container")[0];
  var parents = Array.prototype.slice.call(postContainer.getElementsByClassName("post-link"));
  
  for (var i = 0; i < parents.length; i++) {
    parents[i] = getPostWithID(parents[i].getAttribute("data-id"));
  }
  return parents;
}

function getPostWithID(id) {
  return document.getElementById("p" + id);
}

function isFiltered(post) {
  // Might be null if not shown (eg when only showing last 100 posts)
  if (post == null)
    return false;
  return post.className.includes(REMOVED);
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

newPostObserver   = new MutationObserver(postCreationHandler);
var obsConfig         = { childList: true };

// Create Filtered Counter on top
if (!hideFilterCount)
    createRemovedCounter();

// Start new post observer
newPostObserver.observe(threadContainer, obsConfig);

// Delete old posts
var oldPosts = Array.prototype.slice.call(threadContainer.getElementsByTagName('article'));
opPost = oldPosts.shift(); // Ignore OP
for (var post of oldPosts)
  checkForRemoval(post);
