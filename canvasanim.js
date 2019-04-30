class AnimImage {
    constructor(spec) {
        if (spec.includes(',')) {
            
            var items = spec.split(',');

            this.interval = items[items.length - 1];

            this.images = [];
            for (var i = 0; i < items.length - 1; ++i) {
                var img = new Image();
                img.src = items[i];
                this.images.push(img);
            }
        }
        else {
            var img = new Image();
            img.src = spec;
            this.images = [img];
            this.interval = 0;
        }
    }

    draw(ctx, elapsed, x, y) {
        if (this.interval == 0) {
            ctx.drawImage(this.images[0], x, y);
        }
        else {
            var ix = Math.floor(elapsed / this.interval);
            ix = ix % this.images.length;
            ctx.drawImage(this.images[ix], x, y);
        }
    }
}

class Stage {
    constructor(timelines, groups, restartAfter) {
        this.originalTimelines = timelines;
        this.groups = groups;
        this.restartAfter = restartAfter;

        this.initialize();
    }

    initialize() {
        this.timelines = JSON.parse(JSON.stringify(this.originalTimelines));
        this.images = {};
        this.start = null;
        this.elapsed = null;
        this.paused = false;
        this.offset = [0,0];
        
        for (var ix in this.timelines) {
            var timeline = this.timelines[ix];

            var img = new AnimImage(timeline["src"]);
            
            this.images[timeline["id"]] = img;
        }

    }

    togglePause(time) {
        if (!this.paused) {
            this.paused = true;
        }
        else {
            this.start = time - this.elapsed;
            this.paused = false;     
        }
    }

    updateElapsed(time) {
        if (!this.paused) {
            this.elapsed = time - this.start;
        }
    }

    updateOffset(timeline) {
        var group = timeline["group"];
        if (this.groups[group]) {
            this.offset = [this.groups[group]["x"],this.groups[group]["y"]];
        } 
        else {
            this.offset = [0,0];
        }
    }
    
    draw(ctx, time) {

        if (this.start == null) {
            this.start = time;
        }

        this.updateElapsed(time);

        if (this.restartAfter && this.elapsed > this.restartAfter) {
            this.initialize();
        }

        for (var ix in timelines) {
            var timeline = this.timelines[ix];
            this.drawTimeline(ctx, timeline);
        }
    }
    
    drawTimeline(ctx, timeline) {
        
        var id = timeline["id"];
        var img = this.images[id];

        this.updateOffset(timeline);

        for (var ix in timeline["events"]) {
            var event = timeline["events"][ix];
            if (this.elapsed >= event["starttime"] && (event["endtime"] == -1 || this.elapsed < event["endtime"])) {
                switch(event["type"]) {
                    case "static":
                        this.drawStatic(ctx, img, event);
                        break;
                    case "interp":
                        this.drawInterpolated(ctx, img, event);
                        break;
                    case "periodic":
                        this.drawPeriodic(ctx, img, event);
                        break;
                }            
            }
        }
    }

    drawStatic(ctx, img, event) {
                       
        var x = event["x"];
        var y = event["y"];
    
        var offx = this.offset[0];
        var offy = this.offset[1];

        img.draw(ctx, this.elapsed, offx + x, offy + y);
    }

    drawInterpolated(ctx, img, event) {
                                    
        var n = this.elapsed - event["starttime"];
        var d = event["endtime"] - event["starttime"];
        var r = n / d;
    
        var dx = (event["endx"] - event["startx"]) * r;
        var dy = (event["endy"] - event["starty"]) * r;

        var x = event["startx"] + dx;
        var y = event["starty"] + dy;
    
        var offx = this.offset[0];
        var offy = this.offset[1];

        img.draw(ctx, this.elapsed, offx + x, offy + y);
        
    }
    
    drawPeriodic(ctx, img, event) {
        
        var period = event["period"];
        var periodNum = Math.floor(this.elapsed / period);

        var dx = 0;
        var dy = 0;
        
        if (periodNum % 2 == 1) {

            var n = this.elapsed - (periodNum * period);
            var d = period;
            var r = n / d;
            
            dx = event["dx"] * r;
            dy = event["dy"] * r;
        }
        else if (event["currPeriodNum"] != periodNum) {
            event["startx"] += event["dx"];
            event["starty"] += event["dy"];
            event["currPeriodNum"] = periodNum;
        }    
        
        var x = event["startx"] + dx;
        var y = event["starty"] + dy;

        var offx = this.offset[0];
        var offy = this.offset[1];

        img.draw(ctx, this.elapsed, offx + x, offy + y);
        
    }

}
