import { Component, ComponentEvent, managed, managedChild } from "../core";
import { UIComponent, UIRenderable, UIRenderableConstructor } from "./UIComponent";
import { renderContextBinding, UIRenderContext } from "./UIRenderContext";

/** Base class for a controller that encapsulates a single renderable component, without producing any output of its own */
export class UIRenderableController<TContent extends UIRenderable = UIRenderable>
  extends Component.with({
    renderContext: renderContextBinding,
  })
  implements UIRenderable {
  static preset(presets: object, Content?: UIRenderableConstructor): Function {
    this.prototype._ContentClass = Content;
    return super.preset(presets, Content);
  }

  /** Create a new controller with given content */
  constructor(content?: TContent) {
    super();
    this.propagateChildEvents(ComponentEvent);
    this.content = content
      ? content
      : this._ContentClass
      ? (new this._ContentClass() as any)
      : undefined;
  }

  /** Application render context, propagated from the parent composite object */
  @managed
  renderContext?: UIRenderContext;

  /** Renderable content, as a managed child reference */
  @managedChild
  content?: TContent;

  render(callback?: UIRenderContext.RenderCallback) {
    this._renderer.render(this.content, callback);
  }

  private _renderer = new UIComponent.DynamicRendererWrapper();

  // set on prototype:
  private _ContentClass?: UIRenderableConstructor;
}

// observe to re-render when content changes
UIRenderableController.addObserver(
  class {
    constructor(public readonly component: UIRenderableController) {}
    onContentChange() {
      this.component.render();
    }
  }
);
