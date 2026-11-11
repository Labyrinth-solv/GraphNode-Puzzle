using GraphNode.Foundation.Services;
using UnityEngine;

namespace GraphNode.Services
{
    public sealed class UnityClock : IClock
    {
        public float DeltaTime => Time.deltaTime;
        public double RealtimeSinceStartup => Time.realtimeSinceStartupAsDouble;
    }
}
