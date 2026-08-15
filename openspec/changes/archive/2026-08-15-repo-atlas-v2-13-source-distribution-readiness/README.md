# v2.13 source distribution readiness

This change evaluates the public source-first delivery path and adds an explicit, pinned real DeepSeek Harness compatibility smoke path. It does not publish RepoAtlas, remove `private: true`, create a compiled distribution, or grant the plugin runtime network, Shell, installation, or persistence authority.

The real Harness workflow is deliberately manual. A failed or unavailable external smoke remains an unevaluated compatibility claim; it is never converted into a release or runtime success claim.
