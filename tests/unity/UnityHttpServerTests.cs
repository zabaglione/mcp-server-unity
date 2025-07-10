using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using NUnit.Framework;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.TestTools;

namespace UnityMCP.Tests
{
    [TestFixture]
    public class UnityHttpServerTests
    {
        private const string BASE_URL = "http://localhost:23457";
        private HttpClient httpClient;

        [SetUp]
        public void Setup()
        {
            httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(5);
        }

        [TearDown]
        public void TearDown()
        {
            httpClient?.Dispose();
        }

        [Test]
        public async Task Server_ShouldRespondToPing()
        {
            // Arrange
            var request = new { method = "ping" };
            var content = new StringContent(JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");

            // Act
            var response = await httpClient.PostAsync($"{BASE_URL}/", content);
            var responseBody = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<dynamic>(responseBody);

            // Assert
            Assert.IsTrue(response.IsSuccessStatusCode);
            Assert.AreEqual("ok", result.status.ToString());
        }

        [Test]
        public async Task CreateScript_ShouldReturnSuccessWithValidParams()
        {
            // Arrange
            var request = new
            {
                method = "script/create",
                fileName = "TestScript",
                content = "public class TestScript : MonoBehaviour { }",
                folder = "Assets/Scripts/Test"
            };
            var content = new StringContent(JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");

            // Act
            var response = await httpClient.PostAsync($"{BASE_URL}/", content);
            var responseBody = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<dynamic>(responseBody);

            // Assert
            Assert.IsTrue(response.IsSuccessStatusCode);
            Assert.IsTrue(result.success);
            Assert.IsNotNull(result.path);
            Assert.IsNotNull(result.guid);
        }

        [Test]
        public async Task CreateScript_ShouldReturnErrorWithMissingFileName()
        {
            // Arrange
            var request = new
            {
                method = "script/create",
                content = "public class TestScript : MonoBehaviour { }"
            };
            var content = new StringContent(JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");

            // Act
            var response = await httpClient.PostAsync($"{BASE_URL}/", content);
            var responseBody = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<dynamic>(responseBody);

            // Assert
            Assert.AreEqual(400, (int)response.StatusCode);
            Assert.IsFalse(result.success);
            Assert.IsNotNull(result.error);
        }

        [Test]
        public async Task ReadScript_ShouldReturnContentForExistingFile()
        {
            // Arrange - First create a script
            var createRequest = new
            {
                method = "script/create",
                fileName = "ReadTestScript",
                content = "// Test content",
                folder = "Assets/Scripts/Test"
            };
            await httpClient.PostAsync($"{BASE_URL}/", 
                new StringContent(JsonConvert.SerializeObject(createRequest), Encoding.UTF8, "application/json"));

            // Act - Read the script
            var readRequest = new
            {
                method = "script/read",
                path = "Assets/Scripts/Test/ReadTestScript.cs"
            };
            var response = await httpClient.PostAsync($"{BASE_URL}/",
                new StringContent(JsonConvert.SerializeObject(readRequest), Encoding.UTF8, "application/json"));
            var responseBody = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<dynamic>(responseBody);

            // Assert
            Assert.IsTrue(response.IsSuccessStatusCode);
            Assert.IsTrue(result.success);
            Assert.AreEqual("// Test content", result.content.ToString());
        }

        [Test]
        public async Task CreateShader_ShouldReturnSuccessWithValidParams()
        {
            // Arrange
            var request = new
            {
                method = "shader/create",
                name = "TestShader",
                content = "Shader \"Custom/TestShader\" { }",
                folder = "Assets/Shaders"
            };
            var content = new StringContent(JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");

            // Act
            var response = await httpClient.PostAsync($"{BASE_URL}/", content);
            var responseBody = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<dynamic>(responseBody);

            // Assert
            Assert.IsTrue(response.IsSuccessStatusCode);
            Assert.IsTrue(result.success);
            Assert.IsNotNull(result.path);
            Assert.IsNotNull(result.guid);
        }

        [Test]
        public async Task GetProjectInfo_ShouldReturnProjectDetails()
        {
            // Arrange
            var request = new { method = "project/info" };
            var content = new StringContent(JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");

            // Act
            var response = await httpClient.PostAsync($"{BASE_URL}/", content);
            var responseBody = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<dynamic>(responseBody);

            // Assert
            Assert.IsTrue(response.IsSuccessStatusCode);
            Assert.IsNotNull(result.projectPath);
            Assert.IsNotNull(result.unityVersion);
        }

        [Test]
        public async Task InvalidMethod_ShouldReturn404()
        {
            // Arrange
            var request = new { method = "invalid/method" };
            var content = new StringContent(JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");

            // Act
            var response = await httpClient.PostAsync($"{BASE_URL}/", content);

            // Assert
            Assert.AreEqual(404, (int)response.StatusCode);
        }
    }
}