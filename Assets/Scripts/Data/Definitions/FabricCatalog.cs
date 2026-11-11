using System;
using System.Collections.Generic;
using UnityEngine;

namespace GraphNode.Data.Definitions
{
    /// <summary>Danh sách vải đưa vào build (không dùng Resources); lớp nối của App giữ tham chiếu.</summary>
    [CreateAssetMenu(menuName = "GraphNode/Fabric Catalog", fileName = "FabricCatalog")]
    public sealed class FabricCatalog : ScriptableObject
    {
        [SerializeField] private List<FabricDefinition> fabrics = new List<FabricDefinition>();

        public bool TryGet(string fabricId, out FabricDefinition fabric)
        {
            fabric = fabrics.Find(f => f != null && string.Equals(f.Id, fabricId, StringComparison.Ordinal));
            return fabric != null;
        }
    }
}
