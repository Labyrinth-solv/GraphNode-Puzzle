using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.Compilation;

namespace GraphNode.Editor.Build
{
    /// <summary>
    /// Chốt chặn build (CLAUDE.md mục Build): bản phát hành không được chứa gói MCP for Unity. CI dựng từ
    /// manifest đã gỡ gói; bản dựng tay chưa gỡ sẽ hỏng ngay ở đây thay vì lọt ra ngoài. Bản Development bỏ qua.
    /// </summary>
    public sealed class McpReleaseGuard : IPreprocessBuildWithReport
    {
        private const string McpAssemblyPrefix = "MCPForUnity";

        public int callbackOrder => 0;

        public void OnPreprocessBuild(BuildReport report)
        {
            if ((report.summary.options & BuildOptions.Development) != 0) return;
            var found = CompilationPipeline.GetAssemblies(AssembliesType.PlayerWithoutTestAssemblies)
                .Concat(CompilationPipeline.GetAssemblies(AssembliesType.Editor))
                .Select(a => a.name)
                .FirstOrDefault(n => n.StartsWith(McpAssemblyPrefix));
            if (found != null)
                throw new BuildFailedException(
                    $"Release build blocked: assembly '{found}' from com.coplaydev.unity-mcp is in the project. " +
                    "Remove the package line from Packages/manifest.json for release builds (see CLAUDE.md, Build).");
        }
    }
}
