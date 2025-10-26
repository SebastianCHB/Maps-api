let map;
let markers = [];
let infoWindow;
const center = { lat: 30.378746, lng: -107.880062 };
let currentSearch = "Tacos, comida, restaurantes";
let currentCityName = "Nuevo Casas Grandes";
const restaurantListElement = document.getElementById("restaurants-list");

async function initMap() {
  const defaultLocation = center;
  await google.maps.importLibrary("places");

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 14,
    mapId: "ITSNCG-MAP",
  });

  infoWindow = new google.maps.InfoWindow();
  findPlaces(currentSearch);
}

function setupEventListeners() {
  const searchButton = document.getElementById("search-btn");
  const locationInput = document.getElementById("location-input");
  const cafebutton = document.getElementById("btn-cafeterias");
  const gasolineraButton = document.getElementById("btn-gasolinera");
  const hotelesButton = document.getElementById("btn-hoteles");
  const chucheriasButton = document.getElementById("btn-chucherias");

  if (searchButton && locationInput) {
    const performSearch = () => {
      const searchText = locationInput.value.trim();
      if (searchText) {
        searchCityAndPlaces(searchText);
      }
    };

    searchButton.addEventListener("click", performSearch);
    locationInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        performSearch();
      }
    });
  }

  if (cafebutton) {
    cafebutton.addEventListener("click",(event)=>{
        event.preventDefault();
        currentSearch = "Cafe, cafeteria";
        findPlaces(currentSearch);
    })
  }

  if (gasolineraButton) {
    gasolineraButton.addEventListener("click",(event)=>{
        event.preventDefault();
        currentSearch = "Gasolinera";
        findPlaces(currentSearch);
    })
  }
  
  if (hotelesButton) {
    hotelesButton.addEventListener("click",(event)=>{
        event.preventDefault();
        currentSearch = "Hoteles";
        findPlaces(currentSearch);
    })
  }

  if (chucheriasButton) {
    chucheriasButton.addEventListener("click",(event)=>{
        event.preventDefault();
        currentSearch = "Dulceria, tienda de dulces";
        findPlaces(currentSearch);
    })
  }
}

async function searchCityAndPlaces(cityName) {
  const { Geocoder } = await google.maps.importLibrary("geocoding");
  const geocoder = new Geocoder();

  geocoder.geocode({ address: cityName, region: "mx" }, (results, status) => {
    if (status === "OK" && results[0]) {
      const newLocation = results[0].geometry.location;
      center.lat = newLocation.lat();
      center.lng = newLocation.lng();
      map.setCenter(newLocation);

      let foundCityName = null;
      const addressComponents = results[0].address_components;
      
      const localityComponent = addressComponents.find(c => c.types.includes("locality"));
      if (localityComponent) {
        foundCityName = localityComponent.long_name;
      } else {
        const adminArea1 = addressComponents.find(c => c.types.includes("administrative_area_level_1"));
        if (adminArea1) {
            foundCityName = adminArea1.long_name;
        } else {
            foundCityName = cityName;
        }
      }
      currentCityName = foundCityName;

      findPlaces(currentSearch); 
    } else {
      console.error("Geocoding falló con el estado:", status);
      alert(`No se pudo encontrar la ubicación para "${cityName}": ${status}`);
    }
  });
}

async function findPlaces(searchText) {
  clearMarkers();

  const { Place } = await google.maps.importLibrary("places");
  const fullQuery = `${searchText} en ${currentCityName}`;

  const request = {
    textQuery: fullQuery,
    fields: [
      "displayName", "location", "businessStatus",
      "rating", "photos", "formattedAddress",
    ],
    locationBias: {
      center: center,
      radius: 15000 
    },
    isOpenNow: true,
    language: "es-MX",
    maxResultCount: 20,
    region: "mx",
    useStrictTypeFiltering: false,
  };

  console.log("Buscando con query:", fullQuery);

  const { places } = await Place.searchByText(request);
  const { LatLngBounds } = await google.maps.importLibrary("core");
  const bounds = new LatLngBounds();

  if (places.length) {
    console.log("Resultados de Places (New):", places);

    let totalLat = 0;
    let totalLng = 0;

    for (const place of places) {
      totalLat += place.location.lat();
      totalLng += place.location.lng();
      await addMarkerAndDisplay(place, bounds);
    }

    const averageLat = totalLat / places.length;
    const averageLng = totalLng / places.length;
    createAverageMarker({ lat: averageLat, lng: averageLng }, places.length);

    map.fitBounds(bounds);
  } else {
    console.log("No se encontraron resultados para la búsqueda.");
    showNoResultsMessage(fullQuery);
  }
}

async function addMarkerAndDisplay(place, bounds) {
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  const marker = new AdvancedMarkerElement({
    map,
    position: place.location,
    title: place.displayName,
  });

  bounds.extend(place.location);
  markers.push(marker);
  displayRestaurant(place);

  marker.addListener("click", () => {
    infoWindow.close();
    const content = `
      <div class="info-window-content">
          <h6 class="fw-bold">${place.displayName}</h6>
          <p class="mb-1">${place.formattedAddress || "Dirección no disponible"}</p>
          <div class="rating text-warning">⭐ ${place.rating || "N/A"}</div>
      </div>
    `;
    infoWindow.setContent(content);
    infoWindow.open({ anchor: marker, map: map, shouldFocus: false });
    map.panTo(place.location);
  });
}

async function createAverageMarker(averagePosition, count) {
  const iconElement = document.createElement("img");
  iconElement.src = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"; 
  iconElement.style.width = "35px";
  iconElement.style.height = "35px";
  iconElement.style.filter = "drop-shadow(0 2px 3px rgba(0,0,0,0.4))";

  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const averageMarker = new AdvancedMarkerElement({
    map,
    position: averagePosition,
    title: `Promedio de ${count} lugares`,
    content: iconElement,
    zIndex: 999,
  });

  markers.push(averageMarker);

  averageMarker.addListener("click", () => {
    infoWindow.close();
    const content = `
      <div class"info-window-content">
          <h6 class="fw-bold">Ubicación Promedio</h6>
          <p class="mb-1">Centro de ${count} resultados.</p>
      </div>
    `;
    infoWindow.setContent(content);
    infoWindow.open({ anchor: averageMarker, map: map });
  });
}

function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];

  if (infoWindow) infoWindow.close();
  if (restaurantListElement) {
    restaurantListElement.innerHTML = "";
  }
}

async function displayRestaurant(place) {
  if (!restaurantListElement) return;

  let photoUrl = "";
  if (place.photos && place.photos.length > 0) {
    photoUrl = place.photos[0].getURI({
      maxWidth: 500,
      maxHeight: 200,
    });
  }

  let statusText =
    place.businessStatus === "OPERATIONAL"
      ? '<span class="text-success fw-bold">Abierto</span>'
      : '<span class="text-danger fw-bold">Estado Desconocido</span>';

  const card = `
    <div class="restaurant-card p-3" onclick="map.panTo({lat: ${place.location.lat()}, lng: ${place.location.lng()}}); map.setZoom(17);">
        <img src="${photoUrl}" class="w-100 restaurant-img" alt="${place.displayName}" loading="lazy">
        <h6 class="mt-3 mb-1 fw-bold">${place.displayName}</h6>
        <p class="mb-1 text-muted">
            ${place.formattedAddress || "Dirección no disponible"}
        </p>
        <p class="mb-2 text-muted">
            ${statusText} 
        </p>
        <div class="rating text-warning">⭐ ${place.rating || "N/A"}</div>
    </div>
  `;

  restaurantListElement.innerHTML += card;
}

function showNoResultsMessage(searchText) {
  if (restaurantListElement) {
    restaurantListElement.innerHTML = `<p class'text-center mt-4'>No se encontraron resultados para "${searchText}".</p>`;
  }
}

document.addEventListener("DOMContentLoaded", setupEventListeners);