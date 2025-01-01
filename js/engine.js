class Engine {

    constructor(callback) {
        this.callback = callback;
    }

    #points = [];

    setConditions(airSpeed, windSpeed, windDirection) {
        this.airSpeed = airSpeed;
        this.windSpeed = windSpeed;
        this.windDirection = windDirection;
        this.#recalculate();
    }

    add(point, index = null) {
        if (index === null) {
            this.#points.push(point);
        } else {
            this.#points.splice(index + 1, 0, point);
        }
        this.#recalculate();
    }

    remove(point) {
        this.#points = this.#points.filter(p => p !== point);
        this.#recalculate();
    }

    reposition(point, lat, lng) {
        point.lat = lat;
        point.lng = lng;
        this.#recalculate();
    }

    #recalculate() {
        if (this.#points.length < 2 || this.windSpeed >= this.airSpeed) {
            this.callback([], this.#points);
            return;
        }

        let segments = [];

        for (let i = 0; i < this.#points.length - 1; i++) {
            const segment = new Segment(this.airSpeed, this.windSpeed, this.windDirection, this.#points[i], this.#points[i + 1]);
            segments.push(segment);
        }

        this.callback(segments, this.#points);
    }
}

class Segment {
    constructor(airSpeed, windSpeed, windDirection, point1, point2) {
        this.track = this.calculateTrack(point1, point2);
        this.distance = this.haversineDistance(point1, point2);

        const courseInRadians = this.track * (Math.PI / 180);
        const angleDifference = (windDirection - this.track) * (Math.PI / 180);
        const SWC = (windSpeed / airSpeed) * Math.sin(angleDifference);

        if (Math.abs(SWC) > 1) {
            throw new Error("Course cannot be flown - wind too strong");
        }

        let heading = courseInRadians + Math.asin(SWC);

        if (heading < 0) {
            heading = heading + 2 * Math.PI;
        } else if (heading > 2 * Math.PI) {
            heading = heading - 2 * Math.PI;
        }

        const groundSpeed = airSpeed * Math.sqrt(1 - Math.pow(SWC, 2)) - windSpeed * Math.cos(angleDifference);

        if (groundSpeed < 0) {
            throw new Error("course cannot be flown - wind too strong");
        }

        this.heading = heading * (180 / Math.PI);
        this.groundSpeed = groundSpeed;
        this.time = this.distance / groundSpeed * 60;
    };

    haversineDistance(point1, point2) {
        const R = 3958.8; // Radius of the Earth in miles
        const rlat1 = point1.lat * (Math.PI / 180); // Convert degrees to radians
        const rlat2 = point2.lat * (Math.PI / 180); // Convert degrees to radians
        const difflat = rlat2 - rlat1; // Radian difference (latitudes)
        const difflon = (point2.lng - point1.lng) * (Math.PI / 180); // Radian difference (longitudes)

        return 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
    }

    calculateTrack(point1, point2) {
        const lat1 = point1.lat * (Math.PI / 180);
        const lat2 = point2.lat * (Math.PI / 180);
        const diffLong = (point2.lng - point1.lng) * (Math.PI / 180);

        const x = Math.sin(diffLong) * Math.cos(lat2);
        const y = Math.cos(lat1) * Math.sin(lat2) - (Math.sin(lat1) * Math.cos(lat2) * Math.cos(diffLong));

        let bearing = Math.atan2(x, y) * (180 / Math.PI);
        bearing = (bearing + 360) % 360; // Normalize to 0-360

        return bearing;
    }
}

class Point {
    constructor(lat, lng) {
        this.lat = lat;
        this.lng = lng;
    }
}
