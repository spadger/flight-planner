let map;

async function initMap() {
    const home = {lat: 51.7945, lng: 0.926};
    const {Map} = await google.maps.importLibrary("maps");
    const {AdvancedMarkerElement} = await google.maps.importLibrary("marker");
    const engine = new Engine(render);

    map = new Map(document.getElementById("map"), {
        zoom: 13,
        center: home,
        mapId: "planner",
        zoomControl: true,
        scaleControl: true,
        clickableIcons: false,
    });

    const polyline = new google.maps.Polyline({
        map: map,
        path: [],
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 4,
        geodesic: true,
    })

    polyline.addListener("click", event => {
        const clickLocation = event.latLng;
        let closestSegment = null;
        let minDistance = Infinity;

        for (let i = 0; i < polyline.getPath().getLength() - 1; i++) {
            const segmentStart = polyline.getPath().getAt(i);
            const segmentEnd = polyline.getPath().getAt(i + 1);
            const distance = distanceToSegment(clickLocation, segmentStart, segmentEnd);

            if (distance < minDistance) {
                minDistance = distance;
                closestSegment = {start: segmentStart, end: segmentEnd, index: i};
            }
        }

        if (closestSegment) {
            createMarker(clickLocation, closestSegment.index);
        }
    });

    function createMarker(latLng, index = null) {

        let justDragged = false;
        let dragTimeoutCanceller = null;

        const marker = new AdvancedMarkerElement({
            map: map,
            position: latLng,
            gmpDraggable: true,
            gmpClickable: true,
        });

        const point = new Point(latLng.lat(), latLng.lng())
        engine.add(point, index);

        marker.addListener("drag", x => {
            engine.reposition(point, x.latLng.lat(), x.latLng.lng());
            justDragged = true;
            clearTimeout(dragTimeoutCanceller);
            dragTimeoutCanceller = setTimeout(() => { justDragged = false; }, 2_000);
        });

        marker.addEventListener('touchend', () => {
            if(justDragged){
                return;
            }
            marker.setMap(null);
            engine.remove(point);
        });

        marker.addEventListener("gmp-click", () => {
            console.log('gmp-click');
            marker.setMap(null);
            engine.remove(point);
        });

    }

    map.addListener("click", async event => {
        createMarker(event.latLng);
    });

    function render(segments, points) {
        // console.log(segments);

        polyline.setPath(points);
        document.getElementById("info").hidden = segments.length === 0;

        const infoTable = document.getElementById("segments");
        infoTable.innerHTML = "";
        segments.forEach(segment => {
            const row = document.createElement("tr");

            const trackCell = document.createElement("td");
            trackCell.textContent = Math.round(segment.track).toString().padStart(3, '0') + '°';
            row.appendChild(trackCell);

            const headingCell = document.createElement("td");
            headingCell.textContent = Math.round(segment.heading).toString().padStart(3, '0') + '°';
            row.appendChild(headingCell);

            const distanceCell = document.createElement("td");
            distanceCell.textContent = segment.distance.toFixed(2);
            row.appendChild(distanceCell);

            const timeCell = document.createElement("td");
            timeCell.textContent = Math.round(segment.time).toString();
            row.appendChild(timeCell);

            const groundSpeedCell = document.createElement("td");
            groundSpeedCell.textContent = Math.round(segment.groundSpeed).toString();
            row.appendChild(groundSpeedCell);

            infoTable.appendChild(row);
        });
    }

    document.querySelectorAll(".engineInput").forEach(input => {
        input.addEventListener("change", updateEngineInput);
    });

    function updateEngineInput() {

        const windDirectionControl = document.getElementById("windDirection");
        let windDirection = parseInt(windDirectionControl.value);
        if (windDirection >= 360) {
            windDirection = windDirection % 360;
            windDirectionControl.value = windDirection.toString();
        }

        const airSpeed = parseInt(document.getElementById("airSpeed").value);
        const windSpeed = parseInt(document.getElementById("windSpeed").value);

        if (windSpeed >= airSpeed) {
            alert("Wind speed cannot be greater than air speed");
        }

        engine.setConditions(airSpeed, windSpeed, windDirection);

        const arrow = document.getElementById("arrow");
        arrow.style.transform = `rotate(${windDirection}deg)`;
    }

    updateEngineInput();
}

function distanceToSegment(point, segmentStart, segmentEnd) {
    const pointLat = point.lat();
    const pointLng = point.lng();
    const startLat = segmentStart.lat();
    const startLng = segmentStart.lng();
    const endLat = segmentEnd.lat();
    const endLng = segmentEnd.lng();

    const startLatDiff = pointLat - startLat;
    const startLngDiff = pointLng - startLng;
    const endLatDiff = endLat - startLat;
    const endLngDiff = endLng - startLng;

    const dot = startLatDiff * endLatDiff + startLngDiff * endLngDiff;
    const len_sq = endLatDiff * endLatDiff + endLngDiff * endLngDiff;
    const param = len_sq !== 0 ? dot / len_sq : -1;

    let xx, yy;

    if (param < 0) {
        xx = startLat;
        yy = startLng;
    } else if (param > 1) {
        xx = endLat;
        yy = endLng;
    } else {
        xx = startLat + param * endLatDiff;
        yy = startLng + param * endLngDiff;
    }

    const dx = pointLat - xx;
    const dy = pointLng - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

await initMap();
