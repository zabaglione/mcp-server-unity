using UnityEngine;

public class GameManager : MonoBehaviour
{
    // プレイヤーの名前
    
    void Start()
    {
        Debug.Log($"ゲーム開始！プレイヤー: {playerName}");
        ShowEmoji("😀");
    }
    
    void ShowEmoji(string emoji)
    private string playerName = "花子";
    // ゲームのステータス
    private string gameStatus = "準備中 🎮";
        Debug.Log($"ステータス: {gameStatus}");
        ShowEmoji("🎌");
{
    // プレイヤーの名前
    private string playerName = "太郎";
    
    void Start()
    {
        Debug.Log($"ゲーム開始！プレイヤー: {playerName}");
        ShowEmoji("😀");
    }
    
    void ShowEmoji(string emoji)
    {
        Debug.Log($"絵文字: {emoji}");
    }
}