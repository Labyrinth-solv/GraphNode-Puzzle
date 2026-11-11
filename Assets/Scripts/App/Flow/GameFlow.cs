using System;
using System.Threading;
using Cysharp.Threading.Tasks;
using GraphNode.Foundation.Contracts;
using GraphNode.Foundation.Services;

namespace GraphNode.App.Flow
{
    /// <summary>Luồng Home → Gameplay → Home (tài liệu kiến trúc mục 5.1).</summary>
    public sealed class GameFlow : IGameFlow
    {
        private readonly ISceneTransition _transition;

        public LevelRequest CurrentRequest { get; private set; }

        public GameFlow(ISceneTransition transition)
        {
            _transition = transition ?? throw new ArgumentNullException(nameof(transition));
        }

        public UniTask StartLevelAsync(LevelRequest request, CancellationToken ct)
        {
            CurrentRequest = request ?? throw new ArgumentNullException(nameof(request));
            return _transition.GoToAsync(SceneIds.Gameplay, ct);
        }

        public UniTask ReturnHomeAsync(CancellationToken ct)
        {
            CurrentRequest = null;
            return _transition.GoToAsync(SceneIds.Home, ct);
        }
    }
}
