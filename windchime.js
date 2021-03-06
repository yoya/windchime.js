"use strict;"
var scale = 50.0;
var tubeNum = 24;

/*
 * WebAudio
 */
window.AudioContext = window.AudioContext||window.webkitAudioContext;
var context = null;

var MusicBox = function(keyNum) {
    this.keyNum = keyNum;
    this.playbackRateList = new Array(keyNum);
    this.buffer = null;
    var rate = 0.3;
    //          var tone = Math.pow(2, 1/6);
    var tone = Math.pow(2, 1/12); // semitone
    for (var i = 0 ; i < keyNum ; i++) {
        this.playbackRateList[i] = rate;
        rate *= tone;
    }
};

MusicBox.prototype.load = function(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    function onError(err) {
        console.error(err);
    }
    // Decode asynchronously
    request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
            MusicBox.buffer = buffer;
        }, onError);
    }
    request.send();
};

MusicBox.prototype.play = function(i, v) {
    if (MusicBox.buffer === null) {
        return false;
    }
    var src = context.createBufferSource();
    var rate = this.playbackRateList[i];
    var gain = context.createGain();
    src.buffer = MusicBox.buffer; // XXX
    src.playbackRate.value = rate;
    //          gain.gain.value = v;
    //          gain.gain.value = v * rate;
    gain.gain.linearRampToValueAtTime(v * rate, context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 2);
    src.connect(gain);
    gain.connect(context.destination);
    src.start(0);
};

/*
 *  Box2dWeb
 */
var world;
var isMouseDown = false, mouseJoint = null;
var mouseX = null, mouseY = null;

function init() {
    var tubeBox = null;
    function initAudio() {
        if (context) { return ; }
        // WebAudio
        console.debug("initAudio");
        context = new AudioContext();
        tubeBox = new MusicBox(tubeNum);
        tubeBox.load("Glocken.m4a");
        // dummy play
        var osc = context.createOscillator();
        var gain = context.createGain();
        //osc.connect(context.gain);
	osc.connect(gain);
        gain.connect(context.destination);
        gain.gain.value = 0;
        osc.start(0);
        osc.stop(0);
        osc = gain = null;
    }
    // Box2dWeb
    var   b2Vec2 = Box2D.Common.Math.b2Vec2
    ,  b2World = Box2D.Dynamics.b2World
    ,  b2BodyDef = Box2D.Dynamics.b2BodyDef
    ,  b2Body = Box2D.Dynamics.b2Body
    ,  b2FixtureDef = Box2D.Dynamics.b2FixtureDef
    ,  b2Fixture = Box2D.Dynamics.b2Fixture
    ,  b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
    ,  b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef
    ,  b2DebugDraw = Box2D.Dynamics.b2DebugDraw
    ,  b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef
    ,  b2AABB = Box2D.Collision.b2AABB
    ,  b2ContactListener =  Box2D.Dynamics.b2ContactListener
    ;
    
    world = new b2World(
        new b2Vec2(0, 30)    // gravity
        ,  true                 // allow sleep
    );
    
    var fixDef = new b2FixtureDef;
    //         fixDef.density = 1.0;
    fixDef.density = 0.5;
    fixDef.friction = 0.3;
    fixDef.restitution = 0.5;
    
    var bodyDef = new b2BodyDef;
    
    //create ground
    bodyDef.type = b2Body.b2_staticBody;
    bodyDef.position.x = 10;
    bodyDef.position.y = 1;
    
    fixDef.shape = new b2PolygonShape;
    fixDef.shape.SetAsBox(20, 1);
    // world.CreateBody(bodyDef).CreateFixture(fixDef);
    var myBody = world.CreateBody(bodyDef);
    myBody.CreateFixture(fixDef);
    
    var distanceJointDef = new b2DistanceJointDef;
    distanceJointDef.length=0.2;
    distanceJointDef.dampingRatio = 100;
    distanceJointDef.frequencyHZ =  500;
    
    //create some objects
    bodyDef.type = b2Body.b2_dynamicBody;
    
    for(var i = 0; i < tubeNum; ++i) {
        fixDef.shape = new b2PolygonShape;
        fixDef.shape.SetAsBox(
            0.3 //half width
            ,  7-(i/4) //half height
        );
        var x = 1.5 + i*1.2;
        var y = 10 - i/4;
        bodyDef.position.x = x;
        bodyDef.position.y = y;
	// world.CreateBody(bodyDef).CreateFixture(fixDef);
        var myFix = world.CreateBody(bodyDef);
        myFix.CreateFixture(fixDef);
        myFix.SetUserData(i);
        distanceJointDef.Initialize(myBody, myFix
				    , new b2Vec2(x, 1.5)
				    , new b2Vec2(x, 3.5)
				   );
        world.CreateJoint(distanceJointDef);
    }
    
    //setup debug draw
    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(document.getElementById("canvas").getContext("2d"));
    
    debugDraw.SetDrawScale(scale);
    debugDraw.SetFillAlpha(0.3);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit)
    
    debugDraw.DrawSolidPolygon = function (vertices, vertexCount, color) {
        if (!vertexCount) return;
        var s = this.m_ctx;
        var drawScale = this.m_drawScale;
        s.beginPath();
        s.strokeStyle = this._color(color.color, this.m_alpha);
	
        var grad  = this.m_ctx.createLinearGradient(vertices[0].x * drawScale, vertices[0].y * drawScale, vertices[1].x * drawScale, vertices[1].y * drawScale);
        var color = this._color(color.color, this.m_fillAlpha);
        grad.addColorStop(0, "rgba(100, 100, 100, 100)")
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, "rgba(100, 100, 100, 100)")
        s.fillStyle = grad;
	
        s.moveTo(vertices[0].x * drawScale, vertices[0].y * drawScale);
        for (var i = 1; i < vertexCount; i++) {
            s.lineTo(vertices[i].x * drawScale, vertices[i].y * drawScale);
        }
        s.lineTo(vertices[0].x * drawScale, vertices[0].y * drawScale);
        s.closePath();
        s.fill();
        s.stroke();
    };
    
    world.SetDebugDraw(debugDraw);
    
    /*
     * evend handling
     */
    var canvasPosition = getElementPosition(document.getElementById("canvas"));
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("touchstart", handleTouchMove, true);
    document.addEventListener("touchmove", handleTouchMove, true);
    
    function handleMouseMove(e) {
        initAudio();
        mouseX = (e.clientX - canvasPosition.x) / world.m_debugDraw.m_drawScale;
        mouseY = (e.clientY - canvasPosition.y) / world.m_debugDraw.m_drawScale;
    }
    
    function handleTouchMove(e) {
        initAudio();
        e.preventDefault(); 
        mouseX = (e.touches[0].pageX - canvasPosition.x) / world.m_debugDraw.m_drawScale;
        mouseY = (e.touches[0].pageY - canvasPosition.y) / world.m_debugDraw.m_drawScale;
    }
    
    function getBodyAtMouse() {
        mousePVec = new b2Vec2(mouseX, mouseY);
        var aabb = new b2AABB();
        aabb.lowerBound.Set(mouseX - 0.001, mouseY - 0.001);
        aabb.upperBound.Set(mouseX + 0.001, mouseY + 0.001);
	
        // Query the world for overlapping shapes.
        selectedBody = null;
        world.QueryAABB(getBodyCB, aabb);
        return selectedBody;
    }
    
    function getBodyCB(fixture) {
        if(fixture.GetBody().GetType() != b2Body.b2_staticBody) {
            if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mousePVec))  {
                selectedBody = fixture.GetBody();
                return false;
            }
        }
        return true;
    }
    
    function update() {
        if (!mouseJoint) {
            var body = getBodyAtMouse();
            if(body) {
                var md = new b2MouseJointDef();
                md.bodyA = world.GetGroundBody();
                md.bodyB = body;
                md.target.Set(mouseX, mouseY);
                md.collideConnected = true;
                md.maxForce = 300.0 * body.GetMass();
                mouseJoint = world.CreateJoint(md);
                body.SetAwake(true);
                mouseJointX = mouseX;
                mouseJointY = mouseY;
            }
        }
        if (mouseJoint) {
            var dx = mouseX - mouseJointX;
            var dy = mouseY - mouseJointY;
            var distance2 = dx*dx + dy*dy;
            if (distance2 < 0.1 * world.m_debugDraw.m_drawScale) {
                mouseJoint.SetTarget(new b2Vec2(mouseX, mouseY));
            } else {
                world.DestroyJoint(mouseJoint);
                mouseJoint = null;
            }
        }
        world.Step(
            1 / 30   //frame-rate
            ,  10       //velocity iterations
            ,  10       //position iterations
        );
        world.DrawDebugData();
        world.ClearForces();
    };
    
    // Contact
    var contactListener = new b2ContactListener;
    contactListener.PostSolve = function(contact, impulse) {
        decayRate = 0.5 + 0.5 * Math.random();
        contact.m_fixtureA.m_body.m_angularVelocity *= decayRate;
        contact.m_fixtureB.m_body.m_angularVelocity *= decayRate;
        var volume = impulse.normalImpulses[0] / 30;
        var i1 = contact.GetFixtureA().GetBody().GetUserData();
        tubeBox.play(i1, volume);
        var i2 = contact.GetFixtureB().GetBody().GetUserData();
        tubeBox.play(i2, volume);
    }
    world.SetContactListener(contactListener);
    window.setInterval(update, 1000 / 30);
};

//http://js-tut.aardon.de/js-tut/tutorial/position.html
function getElementPosition(element) {
    var elem = element, tagname = "", x = 0, y = 0;
    while ((typeof(elem) == "object") && (typeof(elem.tagName) != "undefined")) {
        y += elem.offsetTop;
        x += elem.offsetLeft;
        tagname = elem.tagName.toUpperCase();
        if (tagname == "BODY")
            elem=0;
        if (typeof(elem) == "object") {
            if(typeof(elem.offsetParent) == "object")
                elem = elem.offsetParent;
        }
    }
    return {x: x, y: y};
}
