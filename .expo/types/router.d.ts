/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/feed` | `/feed`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/search` | `/search`; params?: Router.UnknownInputParams; } | { pathname: `/review/new`; params?: Router.UnknownInputParams; } | { pathname: `/utils/places`; params?: Router.UnknownInputParams; } | { pathname: `/utils/scoring`; params?: Router.UnknownInputParams; } | { pathname: `/utils/database.types`; params?: Router.UnknownInputParams; } | { pathname: `/utils/db`; params?: Router.UnknownInputParams; } | { pathname: `/utils/storage`; params?: Router.UnknownInputParams; } | { pathname: `/context/auth`; params?: Router.UnknownInputParams; } | { pathname: `/context/SearchContext`; params?: Router.UnknownInputParams; } | { pathname: `/components/ImagePickerModal`; params?: Router.UnknownInputParams; } | { pathname: `/components/SearchFilters`; params?: Router.UnknownInputParams; } | { pathname: `/types`; params?: Router.UnknownInputParams; } | { pathname: `/services/api`; params?: Router.UnknownInputParams; } | { pathname: `/services/location`; params?: Router.UnknownInputParams; } | { pathname: `/services/places`; params?: Router.UnknownInputParams; } | { pathname: `/config`; params?: Router.UnknownInputParams; } | { pathname: `/+not-found`, params: Router.UnknownInputParams & {  } } | { pathname: `/review/[id]`, params: Router.UnknownInputParams & { id: string | number; } };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/feed` | `/feed`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/search` | `/search`; params?: Router.UnknownOutputParams; } | { pathname: `/review/new`; params?: Router.UnknownOutputParams; } | { pathname: `/utils/places`; params?: Router.UnknownOutputParams; } | { pathname: `/utils/scoring`; params?: Router.UnknownOutputParams; } | { pathname: `/utils/database.types`; params?: Router.UnknownOutputParams; } | { pathname: `/utils/db`; params?: Router.UnknownOutputParams; } | { pathname: `/utils/storage`; params?: Router.UnknownOutputParams; } | { pathname: `/context/auth`; params?: Router.UnknownOutputParams; } | { pathname: `/context/SearchContext`; params?: Router.UnknownOutputParams; } | { pathname: `/components/ImagePickerModal`; params?: Router.UnknownOutputParams; } | { pathname: `/components/SearchFilters`; params?: Router.UnknownOutputParams; } | { pathname: `/types`; params?: Router.UnknownOutputParams; } | { pathname: `/services/api`; params?: Router.UnknownOutputParams; } | { pathname: `/services/location`; params?: Router.UnknownOutputParams; } | { pathname: `/services/places`; params?: Router.UnknownOutputParams; } | { pathname: `/config`; params?: Router.UnknownOutputParams; } | { pathname: `/+not-found`, params: Router.UnknownOutputParams & {  } } | { pathname: `/review/[id]`, params: Router.UnknownOutputParams & { id: string; } };
      href: Router.RelativePathString | Router.ExternalPathString | `/_sitemap${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/profile${`?${string}` | `#${string}` | ''}` | `/profile${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/feed${`?${string}` | `#${string}` | ''}` | `/feed${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/search${`?${string}` | `#${string}` | ''}` | `/search${`?${string}` | `#${string}` | ''}` | `/review/new${`?${string}` | `#${string}` | ''}` | `/utils/places${`?${string}` | `#${string}` | ''}` | `/utils/scoring${`?${string}` | `#${string}` | ''}` | `/utils/database.types${`?${string}` | `#${string}` | ''}` | `/utils/db${`?${string}` | `#${string}` | ''}` | `/utils/storage${`?${string}` | `#${string}` | ''}` | `/context/auth${`?${string}` | `#${string}` | ''}` | `/context/SearchContext${`?${string}` | `#${string}` | ''}` | `/components/ImagePickerModal${`?${string}` | `#${string}` | ''}` | `/components/SearchFilters${`?${string}` | `#${string}` | ''}` | `/types${`?${string}` | `#${string}` | ''}` | `/services/api${`?${string}` | `#${string}` | ''}` | `/services/location${`?${string}` | `#${string}` | ''}` | `/services/places${`?${string}` | `#${string}` | ''}` | `/config${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/feed` | `/feed`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/search` | `/search`; params?: Router.UnknownInputParams; } | { pathname: `/review/new`; params?: Router.UnknownInputParams; } | { pathname: `/utils/places`; params?: Router.UnknownInputParams; } | { pathname: `/utils/scoring`; params?: Router.UnknownInputParams; } | { pathname: `/utils/database.types`; params?: Router.UnknownInputParams; } | { pathname: `/utils/db`; params?: Router.UnknownInputParams; } | { pathname: `/utils/storage`; params?: Router.UnknownInputParams; } | { pathname: `/context/auth`; params?: Router.UnknownInputParams; } | { pathname: `/context/SearchContext`; params?: Router.UnknownInputParams; } | { pathname: `/components/ImagePickerModal`; params?: Router.UnknownInputParams; } | { pathname: `/components/SearchFilters`; params?: Router.UnknownInputParams; } | { pathname: `/types`; params?: Router.UnknownInputParams; } | { pathname: `/services/api`; params?: Router.UnknownInputParams; } | { pathname: `/services/location`; params?: Router.UnknownInputParams; } | { pathname: `/services/places`; params?: Router.UnknownInputParams; } | { pathname: `/config`; params?: Router.UnknownInputParams; } | `/+not-found` | `/review/${Router.SingleRoutePart<T>}` | { pathname: `/+not-found`, params: Router.UnknownInputParams & {  } } | { pathname: `/review/[id]`, params: Router.UnknownInputParams & { id: string | number; } };
    }
  }
}
