import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Routing {
    interface ControlOptions {
      waypoints: L.LatLng[];
      routeWhileDragging?: boolean;
      addWaypoints?: boolean;
      fitSelectedRoutes?: boolean;
      showAlternatives?: boolean;
      lineOptions?: {
        styles?: Array<{
          color?: string;
          weight?: number;
          opacity?: number;
        }>;
        extendToWaypoints?: boolean;
        missingRouteTolerance?: number;
      };
      show?: boolean;
      createMarker?: (i: number, waypoint: any, n: number) => L.Marker | null;
    }

    interface Control extends L.Control {
      on(event: string, handler: (e: any) => void): this;
      getWaypoints(): L.LatLng[];
      setWaypoints(waypoints: L.LatLng[]): this;
    }

    function control(options: ControlOptions): Control;
  }
}

declare module 'leaflet-routing-machine' {
  export = L.Routing;
}
