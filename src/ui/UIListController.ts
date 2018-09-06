import { Component, ComponentConstructor, managed, ManagedList, ManagedMap, ManagedObject } from "../core";
import { UICloseColumn } from "./containers/UIColumn";
import { UIContainer } from "./containers/UIContainer";
import { UIComponent, UIComponentEvent, UIRenderable } from "./UIComponent";
import { UIRenderableController } from "./UIRenderableController";
import { UIStyle } from "./UIStyle";

/** Type definition for a component constructor that accepts a single object argument, and constructs a renderable component */
export interface UIListItemAdapter<TObject extends ManagedObject = ManagedObject> {
    new (object: TObject): UIRenderable;
}

/** Default container used in the preset method */
const _defaultContainer = UICloseColumn.with({
    allowKeyboardFocus: true,
    style: UIStyle.create("UIListContainer", {
        dimensions: { grow: 0 },
        containerLayout: { distribution: "start" }
    })
});

/** Renderable wrapper that populates an encapsulated container with a given list of managed objects and a view adapter (component constructor) */
export class UIListController extends UIRenderableController {
    static preset(presets: UIListController.Presets,
        ListItemAdapter?: UIListItemAdapter,
        container: ComponentConstructor & (new () => UIContainer) = _defaultContainer): Function {
        this.observe(class {
            constructor(public controller: UIListController) { }
            readonly contentMap = new ManagedMap<UIRenderable>();
            onFocusIn(e: UIComponentEvent) {
                // focus the appropriate list item
                if (e.source !== this.controller.content) {
                    this.controller.lastFocusedIndex =
                        Math.max(0, this.controller.getIndexOfComponent(e.source));
                }
                else {
                    this.controller.restoreFocus();
                }
            }
            onArrowUpKeyPress(e: UIComponentEvent) {
                if (this.controller.enableArrowKeyFocus) {
                    let target = this._getListItemComponent(e.source);
                    if (target) target.requestFocusPrevious();
                }
            }
            onArrowDownKeyPress(e: UIComponentEvent) {
                if (this.controller.enableArrowKeyFocus) {
                    let target = this._getListItemComponent(e.source);
                    if (target) target.requestFocusNext();
                }
            }
            _getListItemComponent(source?: Component) {
                let target: UIComponent | undefined;
                while (source && source !== this.controller.content) {
                    if (source instanceof UIComponent) target = source;
                    source = source.getParentComponent();
                }
                return target;
            }
            onFirstIndexChange() { this.onItemsChangeAsync() }
            onMaxItemsChange() { this.onItemsChangeAsync() }
            onItemsChangeAsync() {
                // update the container's content, if possible
                let container = this.controller.content as UIContainer;
                let content = container && container.content;
                if (!content) return;
                let list = this.controller.items;
                let Adapter = ListItemAdapter;
                if (!list || !Adapter) {
                    content.clear();
                    return;
                }

                // use entire list, or just a part of it
                let firstIndex = this.controller.firstIndex;
                if (!(firstIndex >= 0)) firstIndex = 0;
                let maxItems = this.controller.maxItems;
                let items = (firstIndex > 0 || maxItems! >= 0) ?
                    (list.count > 0 && firstIndex < list.count) ?
                        list.take(maxItems! >= 0 ? maxItems! : list.count,
                            list.get(this.controller.firstIndex)) : [] :
                    list;

                // keep track of existing view components for each object
                let map = this.contentMap;
                let components: UIRenderable[] = [];
                let created = map.toObject();
                for (let item of items) {
                    let component = created[item.managedId];
                    if (!component) {
                        component = new Adapter(item);
                        map.set(String(item.managedId), component);
                    }
                    else {
                        delete created[item.managedId];
                    }
                    components.push(component);
                }
                content.replace(components);

                // delete components that should no longer be in the list
                for (let oldKey in created) {
                    map.remove(created[oldKey]);
                }
            }
        })
        return super.preset(presets, container);
    }

    /** Create a new list controller for given container */
    constructor(container?: UIContainer) {
        super(container);
        this.propagateChildEvents(UIComponentEvent);
    }

    /** Set to true to enable selection (focus movement) using up/down arrow keys */
    enableArrowKeyFocus = true;
    
    /** List of objects, each object is used to construct one content component */
    @managed
    items = new ManagedList();

    /** Index of first item to be shown in the list (for e.g. pagination, or sliding window positioning), defaults to 0 */
    firstIndex = 0;

    /** Maximum number of items to be shown in the list (for e.g. pagination, or sliding window positioning), defaults to `undefined` to show all items */
    maxItems?: number;

    /** Last focused index, if any */
    lastFocusedIndex = 0;

    /** Returns the list index of given component, or of the component that it is contained in; or returns -1 if given component is not found in the list */
    getIndexOfComponent(component?: Component) {
        let container = this.content as UIContainer;
        if (!container) return -1;
        while (component && component.getParentComponent() !== container) {
            component = component.getParentComponent();
        }
        if (component) return container.content.indexOf(component as any);
        return -1;
    }

    /** Request input focus for the last focused list component, or the first item, if possible */
    restoreFocus(e?: UIComponentEvent) {
        // pass on to last focused component (or first)
        let container = this.content as UIContainer;
        if (container && container.content.count > 0) {
            let index = Math.min(container.content.count - 1,
                Math.max(this.lastFocusedIndex, 0));
            let goFocus: any = container.content.get(index);
            (window as any).__list = this.content;
            if (typeof goFocus.requestFocus === "function") goFocus.requestFocus();
        }
    }
}

export namespace UIListController {
    /** UIListController presets type, for use with `Component.with` */
    export interface Presets {
        /** List of items: initial values, or a list binding */
        items?: Iterable<ManagedObject>;
        /** Set to true to enable selection (focus movement) using up/down arrow keys, defaults to true */
        enableArrowKeyFocus?: boolean;
        /** Index of first item to be shown in the list (for e.g. pagination, or sliding window positioning), defaults to 0 */
        firstIndex?: number;
        /** Maximum number of items to be shown in the list (for e.g. pagination, or sliding window positioning), defaults to `undefined` to show all items */
        maxItems?: number;
    }
}
